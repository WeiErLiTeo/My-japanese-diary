// --- Vercel Function: deleteSummary.js ---
// 删除日记 (已转换为 Vercel 语法)

export default async function handler(request, response) {
    
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. --- 获取环境变量 ---
    const { 
        ADMIN_PASSWORD,
        GITHUB_TOKEN,
        REPO_OWNER,
        REPO_NAME,
    } = process.env;
    
    const FILE_PATH = 'data/summaries.json';
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // 2. --- 验证和解析 ---
    let entryId, password;
    try {
        const body = request.body; // Vercel 自动解析
        password = body.password;
        entryId = body.id; // 这是用于标识条目的 ISO 日期字符串

        if (password !== ADMIN_PASSWORD) {
            return response.status(401).json({ error: '🔑 密码无效' });
        }
        if (!entryId) {
            return response.status(400).json({ error: '未提供条目ID' });
        }
    } catch (e) {
        return response.status(400).json({ error: '无效的请求' });
    }

    // 3. --- 从 GitHub 获取、过滤并写回文件 ---
    try {
        // 3.1. 获取当前文件内容和 SHA
        let currentSummaries = [];
        let currentSha = null;

        const getFileResponse = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Function-DeleteSummary'
            }
        });
        
        if (getFileResponse.status === 404) {
            return response.status(404).json({ error: '日记文件未找到，无法删除' });
        }
        if (!getFileResponse.ok) {
            throw new Error(`GitHub API 读取失败: ${getFileResponse.statusText}`);
        }

        const fileData = await getFileResponse.json();
        currentSha = fileData.sha;
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        try {
             currentSummaries = JSON.parse(content);
        } catch (parseError) {
            // 如果文件为空或损坏
             return response.status(500).json({ error: '日记文件解析失败，无法删除' });
        }


        // 3.2. 过滤掉要删除的条目
        const updatedSummaries = currentSummaries.filter(item => item.date !== entryId);

        // 3.3. 检查是否真的有条目被删除了
        if (currentSummaries.length === updatedSummaries.length) {
            return response.status(404).json({ error: '未找到要删除的条目' });
        }

        // 3.4. 将更新后的内容（Base64 编码）发回 GitHub
        const updatedContentBase64 = Buffer.from(JSON.stringify(updatedSummaries, null, 2)).toString('base64');
        
        const commitBody = {
            message: `[日记] ${new Date().toISOString()} 删除一篇总结`,
            content: updatedContentBase64,
            sha: currentSha // 必须提供 sha 来更新
        };

        const updateFileResponse = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Function-DeleteSummary',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitBody)
        });

        if (!updateFileResponse.ok) {
            const errorBody = await updateFileResponse.json();
            throw new Error(`GitHub API 写入失败: ${errorBody.message}`);
        }

        // --- 4. 成功 ---
        return response.status(200).json({ message: '总结删除成功!' });

    } catch (error) {
        console.error('deleteSummary function error:', error);
        return response.status(500).json({ error: `删除日记失败: ${error.message}` });
    }
}


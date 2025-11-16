// --- Netlify Function: deleteSummary.js ---
// 此函数负责“删除”指定的日记条目
// 流程: 1. 认证 -> 2. 获取旧文件 -> 3. 过滤数据 -> 4. 写入新文件

exports.handler = async (event, context) => {
    
    // --- 0. 检查请求方法 ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- 1. 从环境变量获取所有密钥 ---
    const { 
        ADMIN_PASSWORD, // 您在 Netlify UI 中设置的管理密码
        GITHUB_TOKEN,   // 您的 GitHub 个人访问令牌 (PAT)
        REPO_OWNER,     // 您的 GitHub 用户名
        REPO_NAME,      // 您的 GitHub 仓库名
    } = process.env;
    
    const FILE_PATH = 'data/summaries.json'; // 目标文件
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // --- 2. 验证和解析请求 ---
    let entryId, password;
    try {
        const body = JSON.parse(event.body);
        password = body.password;
        entryId = body.id; // 这是用于标识条目的 ISO 日期字符串

        // 2.1 密码认证
        if (password !== ADMIN_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: '🔑 密码无效' }) };
        }
        if (!entryId) {
            return { statusCode: 400, body: JSON.stringify({ error: '未提供条目ID' }) };
        }
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: '无效的请求' }) };
    }

    // --- 3. 从 GitHub 获取、过滤并写回文件 ---
    try {
        // 3.1. 获取当前文件内容和 SHA (必须有SHA才能更新)
        let currentSummaries = [];
        let currentSha = null;

        const getFileResponse = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-DeleteSummary'
            }
        });
        
        // 如果文件不存在或无法读取，则无法删除
        if (!getFileResponse.ok) {
            if (getFileResponse.status === 404) {
                return { statusCode: 404, body: JSON.stringify({ error: '日记文件未找到，无法删除' }) };
            }
            throw new Error(`GitHub API 读取失败: ${getFileResponse.statusText}`);
        }

        const fileData = await getFileResponse.json();
        currentSha = fileData.sha;
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        currentSummaries = JSON.parse(content);

        // 3.2. 过滤掉要删除的条目
        // 我们比较 item.date 和传入的 entryId (它们都是 ISO 字符串)
        const updatedSummaries = currentSummaries.filter(item => item.date !== entryId);

        // 3.3. 检查是否真的有条目被删除了
        if (currentSummaries.length === updatedSummaries.length) {
            // 如果长度没变，说明没有找到匹配的 ID
            return { statusCode: 404, body: JSON.stringify({ error: '未找到要删除的条目' }) };
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
                'User-Agent': 'Netlify-Function-DeleteSummary',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitBody)
        });

        if (!updateFileResponse.ok) {
            const errorBody = await updateFileResponse.json();
            throw new Error(`GitHub API 写入失败: ${errorBody.message}`);
        }

        // --- 4. 成功 ---
        return {
            statusCode: 200,
            body: JSON.stringify({ message: '总结删除成功!' })
        };

    } catch (error) {
        console.error('deleteSummary function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `删除日记失败: ${error.message}` })
        };
    }
};
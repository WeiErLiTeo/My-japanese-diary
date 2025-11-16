// --- Vercel Function: getSummaries.js ---
// 【最终修复版】
// 此版本不再使用 "raw.githubusercontent.com" (它有缓存问题)
// 而是和 getAvatar/submitSummary 一样，使用 GITHUB_TOKEN 和 "api.github.com"
// 来安全地、无缓存地读取私有仓库的文件。

export default async function handler(request, response) {
    
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. --- 获取环境变量 ---
    const { 
        GITHUB_TOKEN,
        REPO_OWNER,
        REPO_NAME,
    } = process.env;

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        console.error('getSummaries 缺少环境变量');
        return response.status(500).json({ error: '服务器配置错误' });
    }

    // 2. --- 构造 GitHub API URL ---
    const FILE_PATH = 'data/summaries.json';
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // 3. --- 在服务器端安全地 Fetch ---
    try {
        const getFileResponse = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Function-getSummaries'
            },
            // 【重要】我们不使用 Vercel 的缓存，而是每次都去 GitHub 拿
            cache: 'no-store'
        });

        // 4. --- 处理响应 ---
        
        // 如果 404 (文件不存在)
        if (getFileResponse.status === 404) {
            // 这说明用户还从未提交过，返回空列表是正确的
            return response.status(200).json([]);
        }

        if (!getFileResponse.ok) {
            const errorText = await getFileResponse.text();
            throw new Error(`GitHub API 读取失败: ${getFileResponse.status} ${errorText}`);
        }

        const fileData = await getFileResponse.json();

        // 检查 GitHub API 是否返回了 'base64' 编码的 'content'
        if (fileData && fileData.encoding === 'base64' && fileData.content) {
            
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            let summaries;

            try {
                summaries = JSON.parse(content);
            } catch (parseError) {
                // 文件内容不是一个有效的 JSON
                console.error('data/summaries.json 解析失败:', parseError);
                throw new Error('日记文件内容已损坏 (JSON格式错误)');
            }

            // 【健壮性检查】 确保它是一个列表
            if (!Array.isArray(summaries)) {
                console.warn('data/summaries.json 不是一个列表 (Array)');
                // 返回空列表
                return response.status(200).json([]);
            }

            // --- 成功 ---
            // 返回日记列表
            return response.status(200).json(summaries);

        } else if (fileData && fileData.size > 0) {
            // 如果文件大于 1MB, GitHub API 不会返回 'content'
            // 我们必须去 fileData.download_url 获取
            const downloadUrl = fileData.download_url;
            
            // 注意：download_url 也是一个有缓存的链接，但它需要 token
            const downloadResponse = await fetch(downloadUrl, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });

            if (!downloadResponse.ok) {
                throw new Error('下载过大的 summaries.json 失败');
            }
            
            const summaries = await downloadResponse.json();
             // (我们假设大于 1MB 的文件格式总是正确的)
            return response.status(200).json(summaries);

        } else {
             // 可能是文件为空 (fileData.size === 0)
            return response.status(200).json([]);
        }

    } catch (error) {
        console.error('getSummaries function error:', error);
        // 如果是 JSON 格式错误，也返回空列表，避免前端崩溃
        if (error.message.includes('JSON格式错误')) {
            return response.status(200).json([]);
        }
        return response.status(500).json({ error: `读取日记失败: ${error.message}` });
    }
}



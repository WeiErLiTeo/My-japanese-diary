// --- Vercel Function: getSummaries.js ---
// 【新增】此函数修复了 BUG，用于从您的 GitHub 仓库读取日记
// 它读取 data/summaries.json 文件

export default async function handler(request, response) {
    
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 目标文件的原始 URL
    const SUMMARIES_URL = 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/data/summaries.json';

    try {
        // fetch 文件，并禁用缓存，确保获取最新数据
        const getFileResponse = await fetch(SUMMARIES_URL, {
            cache: 'no-store' 
        });

        // 如果文件不存在 (404)，说明是第一次，返回空列表
        if (getFileResponse.status === 404) {
            return response.status(200).json([]);
        }

        if (!getFileResponse.ok) {
            throw new Error(`GitHub raw file error: ${getFileResponse.statusText}`);
        }
        
        const summaries = await getFileResponse.json();
        
        // 成功，返回 JSON 列表
        return response.status(200).json(summaries);

    } catch (error) {
        console.error('getSummaries error:', error);
        
        // 如果文件存在但为空(导致JSON解析失败)，也返回空列表
        if (error instanceof SyntaxError) {
            return response.status(200).json([]);
        }
        
        return response.status(500).json({ error: `读取日记失败: ${error.message}` });
    }
}


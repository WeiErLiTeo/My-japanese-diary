// --- Vercel Function: getSummaries.js ---
// 【修复】增加了健壮性检查
// 此函数用于从您的 GitHub 仓库读取日记

export default async function handler(request, response) {
    
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const SUMMARIES_URL = 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/data/summaries.json';

    try {
        const getFileResponse = await fetch(SUMMARIES_URL, {
            cache: 'no-store' 
        });

        if (getFileResponse.status === 404) {
            return response.status(200).json([]);
        }

        if (!getFileResponse.ok) {
            throw new Error(`GitHub raw file error: ${getFileResponse.statusText}`);
        }
        
        const summaries = await getFileResponse.json();
        
        // --- 【新增的健壮性检查】 ---
        // 检查返回的是否是一个列表 (Array)。
        // 如果不是 (比如是 {...} 对象), 返回空列表
        if (!Array.isArray(summaries)) {
            console.warn("data/summaries.json 格式损坏 (不是一个 Array), 已返回空列表。");
            return response.status(200).json([]);
        }
        // --- 检查结束 ---

        return response.status(200).json(summaries);

    } catch (error) {
        console.error('getSummaries error:', error);
        
        if (error instanceof SyntaxError) {
             // 文件为空或JSON损坏
            return response.status(200).json([]);
        }
        
        return response.status(500).json({ error: `读取日记失败: ${error.message}` });
    }
}



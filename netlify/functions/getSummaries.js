// --- Netlify Function: getSummaries.js ---
// 此函数负责从 GitHub 仓库安全地“读取”日记文件
// 使用 Node.js 18+ 的原生 fetch

// atob (Base64 解码) 在 Node.js 16+ 中是全局可用的
// const atob = (b64Encoded) => Buffer.from(b64Encoded, 'base64').toString('utf-8');

exports.handler = async (event, context) => {
    
    // 1. 从环境变量中获取您的 GitHub 信息 (在 Netlify UI 中设置)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const FILE_PATH = 'data/summaries.json'; // 您存放数据的文件

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GitHub 环境变量未正确配置' })
        };
    }

    const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    try {
        // 2. 向 GitHub API 发出请求
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-GetSummaries'
            }
        });

        // 3. 处理响应
        if (!response.ok) {
            // 如果文件不存在 (404)，这是正常情况，返回一个空数组
            if (response.status === 404) {
                return {
                    statusCode: 200,
                    body: JSON.stringify([]) // 文件还未创建，返回空列表
                };
            }
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 4. GitHub API 返回的内容是 Base64 编码的
        const fileContent = Buffer.from(data.content, 'base64').toString('utf-8');
        const summaries = JSON.parse(fileContent);

        return {
            statusCode: 200,
            body: JSON.stringify(summaries)
        };

    } catch (error) {
        console.error('getSummaries function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `读取日记失败: ${error.message}` })
        };
    }
};

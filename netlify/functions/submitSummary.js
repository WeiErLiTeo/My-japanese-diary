// --- Netlify Function: submitSummary.js ---
// 此函数负责“写入”新的日记条目
// 流程: 1. 认证 -> 2. 调用 Gemini -> 3. 获取旧文件 -> 4. 写入新文件

// btoa (Base64 编码) 在 Node.js 16+ 中是全局可用的
// const btoa = (str) => Buffer.from(str).toString('base64');

exports.handler = async (event, context) => {
    
    // --- 0. 检查请求方法 ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- 1. 从环境变量获取所有密钥 ---
    const { 
        ADMIN_PASSWORD, // 您在 Netlify UI 中设置的管理密码
        GEMINI_API_KEY, // 您的 Gemini API 密钥
        GITHUB_TOKEN,   // 您的 GitHub 个人访问令牌 (PAT)
        REPO_OWNER,     // 您的 GitHub 用户名
        REPO_NAME,      // 您的 GitHub 仓库名
    } = process.env;
    
    const FILE_PATH = 'data/summaries.json'; // 目标文件
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // --- 2. 验证和解析请求 ---
    let summaryData;
    try {
        const { password, summary } = JSON.parse(event.body);
        
        // 2.1 密码认证
        if (password !== ADMIN_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: '🔑 密码无效' }) };
        }
        if (!summary || summary.trim() === '') {
            return { statusCode: 400, body: JSON.stringify({ error: '日记内容不能为空' }) };
        }
        summaryData = {
            date: new Date().toISOString(),
            summary: summary,
            gemini_response: null // 预留字段
        };

    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: '无效的请求' }) };
    }

    // --- 3. (可选) 调用 Gemini API 润色 ---
    if (GEMINI_API_KEY) {
        try {
            const prompt = `你是一位亲切的日语老师。请用简体中文，对以下学生的日语学习日记做出一句简短的（不超过30字）、鼓励性或启发性的点评：\n\n"${summaryData.summary}"`;
            
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 100 }
                })
            });
            
            if (geminiResponse.ok) {
                const geminiResult = await geminiResponse.json();
                summaryData.gemini_response = geminiResult.candidates[0].content.parts[0].text.trim();
            }
        } catch (e) {
            console.warn('Gemini API 调用失败:', e.message);
            // 即使 Gemini 失败，也继续执行，只是没有点评
        }
    }

    // --- 4. 将新总结写入 GitHub ---
    try {
        // 4.1. 获取当前文件内容和 SHA (这是更新文件所必需的)
        let currentSummaries = [];
        let currentSha = null;

        try {
            const getFileResponse = await fetch(GITHUB_API_URL, {
                method: 'GET',
                headers: { 
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Netlify-Function-SubmitSummary'
                }
            });
            
            if (getFileResponse.ok) {
                const fileData = await getFileResponse.json();
                currentSha = fileData.sha; // 获取 SHA
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                currentSummaries = JSON.parse(content);
            }
            // 如果 404 (文件不存在), currentSummaries 保持为 [], currentSha 保持为 null, 这是 OK 的
            
        } catch (e) {
            // 忽略读取错误 (比如文件不存在)，我们将创建一个新文件
            console.log('No existing summary file found. Creating a new one.');
        }

        // 4.2. 添加新总结到列表顶部
        currentSummaries.unshift(summaryData);
        
        // 4.3. 将更新后的内容（Base64 编码）发回 GitHub
        const updatedContentBase64 = Buffer.from(JSON.stringify(currentSummaries, null, 2)).toString('base64');
        
        const commitBody = {
            message: `[日记] ${new Date().toISOString()} 添加一篇新总结`,
            content: updatedContentBase64,
            sha: currentSha // 如果是新文件，sha 为 null；如果是更新，则必须提供旧 sha
        };

        const updateFileResponse = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-SubmitSummary',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitBody)
        });

        if (!updateFileResponse.ok) {
            const errorBody = await updateFileResponse.json();
            throw new Error(`GitHub API 写入失败: ${errorBody.message}`);
        }

        // --- 5. 成功 ---
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: '总结提交成功!', 
                data: summaryData 
            })
        };

    } catch (error) {
        console.error('submitSummary function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `写入日记失败: ${error.message}` })
        };
    }
};

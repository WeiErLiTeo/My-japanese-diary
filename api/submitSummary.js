// --- Vercel Function: submitSummary.js ---
// 提交新日记 (已转换为 Vercel 语法)
// 注意：Vercel 会自动处理 Buffer，我们不需要手动引入

export default async function handler(request, response) {
    
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. --- 获取环境变量 ---
    const { 
        ADMIN_PASSWORD,
        GEMINI_API_KEY,
        GITHUB_TOKEN,
        REPO_OWNER,
        REPO_NAME,
    } = process.env;
    
    const FILE_PATH = 'data/summaries.json';
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // 2. --- 验证和解析 ---
    let summaryData;
    try {
        const { password, summary } = request.body; // Vercel 自动解析
        
        if (password !== ADMIN_PASSWORD) {
            return response.status(401).json({ error: '🔑 密码无效' });
        }
        if (!summary || summary.trim() === '') {
            return response.status(400).json({ error: '日记内容不能为空' });
        }
        summaryData = {
            date: new Date().toISOString(),
            summary: summary,
            gemini_response: null
        };

    } catch (e) {
        return response.status(400).json({ error: '无效的请求' });
    }

    // 3. --- (可选) 调用 Gemini API ---
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
        }
    }

    // 4. --- 将新总结写入 GitHub ---
    try {
        // 4.1. 获取当前文件内容和 SHA
        let currentSummaries = [];
        let currentSha = null;

        try {
            const getFileResponse = await fetch(GITHUB_API_URL, {
                method: 'GET',
                headers: { 
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Vercel-Function-SubmitSummary'
                }
            });
            
            if (getFileResponse.ok) {
                const fileData = await getFileResponse.json();
                currentSha = fileData.sha;
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                currentSummaries = JSON.parse(content);
            } else if (getFileResponse.status !== 404) {
                // 忽略 404 (文件不存在)，但抛出其他错误
                throw new Error(`GitHub GET error: ${getFileResponse.statusText}`);
            }
        } catch (e) {
            // 如果解析失败 (比如文件空) 或 404
            console.log('No existing summary file or parse error. Creating new file.');
            currentSummaries = [];
            currentSha = null;
        }

        // 4.2. 添加新总结到列表顶部
        currentSummaries.unshift(summaryData);
        
        // 4.3. 将更新后的内容（Base64 编码）发回 GitHub
        const updatedContentBase64 = Buffer.from(JSON.stringify(currentSummaries, null, 2)).toString('base64');
        
        const commitBody = {
            message: `[日记] ${new Date().toISOString()} 添加一篇新总结`,
            content: updatedContentBase64,
            sha: currentSha // 如果是新文件，sha 为 null
        };

        const updateFileResponse = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Function-SubmitSummary',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitBody)
        });

        if (!updateFileResponse.ok) {
            const errorBody = await updateFileResponse.json();
            throw new Error(`GitHub API 写入失败: ${errorBody.message}`);
        }

        // --- 5. 成功 ---
        return response.status(200).json({ 
            message: '总结提交成功!', 
            data: summaryData 
        });

    } catch (error) {
        console.error('submitSummary function error:', error);
        return response.status(500).json({ error: `写入日记失败: ${error.message}` });
    }
}


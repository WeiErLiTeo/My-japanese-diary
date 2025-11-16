// --- Vercel Function: submitSummary.js ---
// 【修复】增加了健壮性检查，可自动修复损坏的 JSON 文件

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
        const { password, summary } = request.body;
        
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
    // (这部分没有改动)
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
        } catch (e) { console.warn('Gemini API 调用失败:', e.message); }
    }

    // 4. --- 将新总结写入 GitHub ---
    try {
        // 4.1. 获取当前文件内容和 SHA
        let currentSummaries = []; // 默认为空列表
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
                
                let parsedContent;
                try {
                    parsedContent = JSON.parse(content);
                } catch (parseError) {
                    parsedContent = []; // 如果JSON解析失败（比如空文件），视为空列表
                }

                // --- 【新增的健壮性检查】 ---
                // 检查解析出的内容是否是一个列表 (Array)
                if (Array.isArray(parsedContent)) {
                    currentSummaries = parsedContent;
                } else {
                    // 如果不是 (比如是 {...} 对象), 把它重置为空列表
                    // 这会“治愈”损坏的文件
                    console.warn("data/summaries.json 格式损坏 (不是一个 Array), 已重置为空列表。");
                    currentSummaries = []; 
                    // SHA 保持不变，我们将用空列表覆盖掉旧的损坏数据
                }
                // --- 检查结束 ---

            } else if (getFileResponse.status !== 404) {
                throw new Error(`GitHub GET error: ${getFileResponse.statusText}`);
            }
            // (如果是 404, currentSummaries 保持为 [], currentSha 保持为 null, 这是正确的)

        } catch (e) {
            console.log('读取旧文件失败 (或文件不存在), 将创建新文件。');
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
            sha: currentSha 
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



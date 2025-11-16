// --- Netlify Function: submitSummary.js (纯净版) ---
// 功能：验证密码 -> (可选: 极简鼓励) -> 保存到 GitHub

exports.handler = async (event, context) => {
    // 1. 只允许 POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { ADMIN_PASSWORD, GEMINI_API_KEY, GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = process.env;
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/summaries.json`;

    try {
        const { password, summary } = JSON.parse(event.body);

        // 2. 验证密码
        if (password !== ADMIN_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Wrong Password' }) };
        }

        // 3. (可选) 极简 AI 鼓励 (如果不想要，可删除此块)
        let gemini_response = null;
        if (GEMINI_API_KEY && summary) {
            try {
                // 提取纯文本，只请求一句非常简短的鼓励
                const plainText = summary.replace(/<[^>]*>/g, '');
                const prompt = `作为日语老师，用简短的日语(20字以内)鼓励这位写日记的学生: ${plainText}`;
                
                const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const aiData = await aiRes.json();
                gemini_response = aiData.candidates[0].content.parts[0].text.trim();
            } catch (e) {
                console.log("AI skip"); // 失败不影响保存
            }
        }

        // 4. GitHub 保存逻辑
        // A. 获取旧数据
        let currentSummaries = [];
        let sha = null;
        try {
            const getRes = await fetch(GITHUB_API_URL, {
                headers: { 
                    'Authorization': `token ${GITHUB_TOKEN}`, 
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Netlify-Function'
                }
            });
            if (getRes.ok) {
                const data = await getRes.json();
                sha = data.sha;
                currentSummaries = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
            }
        } catch (e) {
            console.log("Creating new file");
        }

        // B. 添加新日记
        const newEntry = {
            date: new Date().toISOString(),
            summary: summary,
            gemini_response: gemini_response
        };
        currentSummaries.unshift(newEntry);

        // C. 写入 GitHub
        const putRes = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function'
            },
            body: JSON.stringify({
                message: 'Add diary entry',
                content: Buffer.from(JSON.stringify(currentSummaries)).toString('base64'),
                sha: sha
            })
        });

        if (!putRes.ok) {
            throw new Error("GitHub Save Failed");
        }

        return { statusCode: 200, body: JSON.stringify(newEntry) };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};



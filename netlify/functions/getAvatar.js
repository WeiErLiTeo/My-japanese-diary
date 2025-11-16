// --- Netlify Function: getAvatar.js ---
// 此函数负责调用 Gemini (Imagen 4) 生成一个二次元头像

exports.handler = async (event, context) => {
    
    // --- 0. 检查请求方法 ---
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- 1. 从环境变量获取 API 密钥 ---
    const { GEMINI_API_KEY } = process.env;

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: '未配置 GEMINI_API_KEY' }) };
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;
    
    // --- 2. 准备请求 ---
    // 【修改】更新了提示词，以生成更符合要求的“热门女头”
    const prompt = "一个高质量、日漫风格的二次元女生头像，色彩鲜艳，适合作为个人资料图片。特写，在网络上很受欢迎的画风，不含文本或水印。";
    
    const payload = {
        instances: [{ prompt: prompt }],
        parameters: { "sampleCount": 1 }
    };

    // --- 3. 调用 API ---
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Imagen API 错误:', errorBody);
            throw new Error(`API 响应失败: ${errorBody?.error?.message || response.statusText}`);
        }

        const result = await response.json();
        
        // 4. --- 处理响应 ---
        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            const base64Data = result.predictions[0].bytesBase64Encoded;
            const imageUrl = `data:image/png;base64,${base64Data}`;
            
            // 成功返回
            return {
                statusCode: 200,
                body: JSON.stringify({ imageUrl: imageUrl })
            };
        } else {
            throw new Error('API 响应中未找到图像数据');
        }

    } catch (error) {
        console.error('getAvatar function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `生成头像失败: ${error.message}` })
        };
    }
};
// --- Vercel Function: checkPassword.js ---
// 验证登录密码 (已转换为 Vercel 语法)

export default async function handler(request, response) {
    
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { ADMIN_PASSWORD } = process.env;
    
    try {
        // Vercel 自动解析 JSON
        const { password } = request.body; 

        if (password === ADMIN_PASSWORD) {
            // 成功
            return response.status(200).json({ ok: true });
        } else {
            // 失败
            return response.status(401).json({ ok: false, error: '🔑 密码无效' });
        }
    } catch (e) {
        return response.status(400).json({ ok: false, error: '无效的请求' });
    }
}


// --- Netlify Function: checkPassword.js ---
// 此函数仅用于在登录时验证密码

exports.handler = async (event, context) => {
    
    // --- 0. 检查请求方法 ---
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- 1. 从环境变量获取密码 ---
    const { ADMIN_PASSWORD } = process.env;

    // --- 2. 验证和解析请求 ---
    let password;
    try {
        const body = JSON.parse(event.body);
        password = body.password;

        // 2.1 密码认证
        if (password === ADMIN_PASSWORD) {
            // 成功
            return { 
                statusCode: 200, 
                body: JSON.stringify({ ok: true }) 
            };
        } else {
            // 失败
            return { 
                statusCode: 401, 
                body: JSON.stringify({ ok: false, error: '🔑 密码无效' }) 
            };
        }
    } catch (e) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ ok: false, error: '无效的请求' }) 
        };
    }
};
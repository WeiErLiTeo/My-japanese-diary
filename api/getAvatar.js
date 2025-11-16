// --- Vercel Function: getAvatar.js ---
// 【方案A - 安全版】
// 此函数在后端安全地使用 GITHUB_TOKEN 访问您的私有仓库，
// 获取图片文件内容，并将其作为 Base64 数据返回。

export default async function handler(request, response) {
    
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. --- 获取环境变量 ---
    const { 
        GITHUB_TOKEN,
        REPO_OWNER,
        REPO_NAME,
    } = process.env;

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        console.error('getAvatar 缺少环境变量');
        return response.status(500).json({ error: '服务器配置错误' });
    }

    // 2. --- 您仓库中的图片列表 ---
    // (您可以像之前一样在这里添加 02.JPG, 03.JPG 等)
    const imageList = [
        'picture/01.JPG'
        // , 'picture/02.JPG'
    ];
    
    // 随机选择一张
    const selectedImagePath = imageList[Math.floor(Math.random() * imageList.length)];
    
    // 3. --- 构造 GitHub API URL (必须是 /contents/ 终结点) ---
    const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${selectedImagePath}`;

    // 4. --- 在服务器端安全地 Fetch ---
    try {
        const fileResponse = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: {
                // 使用 Token 进行认证，可以访问私有仓库
                'Authorization': `token ${GITHUB_TOKEN}`, 
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Function-getAvatar'
            }
        });

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                throw new Error(`文件未在GitHub中找到: ${selectedImagePath}`);
            }
            const errorBody = await fileResponse.text();
            throw new Error(`GitHub API 错误: ${fileResponse.statusText} - ${errorBody}`);
        }

        const fileData = await fileResponse.json();
        
        // 5. --- 返回 Base64 数据 ---
        // GitHub API /contents/ 终结点会返回 'base64' 编码的 'content'
        if (fileData && fileData.encoding === 'base64' && fileData.content) {
            
            // 推断 Mime 类型 (用于数据URI)
            const mimeType = selectedImagePath.endsWith('.JPG') || selectedImagePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
            
            // 构造标准的数据 URI
            const imageDataUrl = `data:${mimeType};base64,${fileData.content}`;
            
            // 将数据发回给前端
            return response.status(200).json({ imageData: imageDataUrl });

        } else {
            // 这通常发生在文件大于 1MB (GitHub API 限制)
            throw new Error('未获取到 Base64 内容 (文件可能过大 > 1MB)');
        }

    } catch (error) {
        console.error('getAvatar function error:', error);
        return response.status(500).json({ error: `获取头像失败: ${error.message}` });
    }
}



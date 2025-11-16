// --- Vercel Function: getAvatar.js ---
// 从您自己的 GitHub 仓库 picture/ 文件夹中获取图片
// 100% 免费，不会导致额度超限

export default async function handler(request, response) {
    
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- 1. 您仓库中的图片列表 ---
    const imageList = [
        'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/01.JPG'
        
        // --- 如何添加更多图片 ---
        // 1. 上传 02.JPG, 03.JPG 等到您 GitHub 的 picture 文件夹
        // 2. 在下面添加新的链接 (注意前面的逗号):
        // , 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/02.JPG'
        // , 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/03.JPG'
    ];

    // --- 2. 随机选择一张图片 ---
    try {
        const randomIndex = Math.floor(Math.random() * imageList.length);
        const selectedImageUrl = imageList[randomIndex];
        
        // --- 3. 成功返回 ---
        // Vercel 使用 .json() 方法返回
        return response.status(200).json({ imageUrl: selectedImageUrl });
        
    } catch (error) {
        console.error('getAvatar function error:', error);
        return response.status(500).json({ error: '获取图片链接失败' });
    }
}


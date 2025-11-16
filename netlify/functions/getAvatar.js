// --- Netlify Function: getAvatar.js ---
// 【修改】这是一个轻量、免费的最终版本
// 它从您自己的 GitHub 仓库 picture/ 文件夹中获取图片
// 这几乎不消耗任何资源，可以永久在免费套餐上运行

exports.handler = async (event, context) => {
    
    // --- 0. 检查请求方法 ---
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // --- 1. 您仓库中的图片列表 ---
    // 【重要】我们使用 "raw.githubusercontent.com" 的原始文件链接
    const imageList = [
        'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/01.JPG'
        
        // --- 如何添加更多图片 ---
        // 1. 上传 02.JPG, 03.JPG 等到您 GitHub 的 picture 文件夹
        // 2. 在下面添加新的链接 (注意前面的逗号):
        // , 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/02.JPG'
        // , 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/03.JPG'
        // , 'https://raw.githubusercontent.com/WeiErLiTeo/My-japanese-diary/main/picture/04.JPG'
    ];

    // --- 2. 随机选择一张图片 ---
    const randomIndex = Math.floor(Math.random() * imageList.length);
    const selectedImageUrl = imageList[randomIndex];

    // --- 3. 成功返回 ---
    try {
        return {
            statusCode: 200,
            // 按照前端 HTML 期望的 JSON 格式返回
            body: JSON.stringify({ imageUrl: selectedImageUrl })
        };
    } catch (error) {
        console.error('getAvatar function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '获取图片链接失败' })
        };
    }
};
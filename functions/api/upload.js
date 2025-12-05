// functions/api/upload.js

export async function onRequestPut(context) {
  const request = context.request;
  const password = request.headers.get("X-Auth-Pass");

  // 验证密码
  if (password !== context.env.PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 生成唯一文件名
  const filename = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

  try {
    // 将图片存入 R2 存储桶
    await context.env.DIARY_IMAGES.put(filename, request.body);

    // 拼接图片的公开访问 URL (需要配置 R2 的公开访问或自定义域名)
    // 环境变量 R2_PUBLIC_URL 例如: https://pub-xxx.r2.dev
    const imageUrl = `${context.env.R2_PUBLIC_URL}/${filename}`;

    return new Response(JSON.stringify({ url: imageUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
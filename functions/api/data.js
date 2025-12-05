// functions/api/data.js

export async function onRequestGet(context) {
  // 从 KV 中读取数据
  const value = await context.env.DIARY_KV.get("diary_data");
  
  // 如果没有数据，返回默认结构
  const data = value ? JSON.parse(value) : { entries: [], checkins: [] };
  
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const request = context.request;
  const password = request.headers.get("X-Auth-Pass");

  // 验证密码 (环境变量 PASSWORD)
  if (password !== context.env.PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await request.json();
    // 将数据存入 KV
    await context.env.DIARY_KV.put("diary_data", JSON.stringify(data));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Error saving data", { status: 500 });
  }
}
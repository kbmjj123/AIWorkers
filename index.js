export default {
  async fetch(request, env) {
    // 限制请求来源（可选）
    // const allowedOrigin = 'https://charadesgenerator.xyz';
    // const origin = request.headers.get('Origin');
    // if (origin !== allowedOrigin) {
    //   return new Response('Forbidden', { status: 403 });
    // }

    // 获取请求数据
    const url = new URL(request.url);
    if (url.pathname === '/api/generate') {
      try {
        const body = await request.json();
        const apiKey = env.DEEPSEEK_KEY; // 从环境变量获取 API Key
        const deepSeekUrl = 'https://api.deepseek.com/v1/chat/completions';

        // 代理请求到 DeepSeek API
        const response = await fetch(deepSeekUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(body)
        });

        // 返回 DeepSeek API 的响应
        return response;
      } catch (error) {
        return new Response('Error: ' + error.message, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
## SpecStory

## 实现 Cloudflare Workers 与 Deepseek API 集成 (2025/3/5 17:43:54)

_**User**_

我现在需要实现一个功能，在 @index.ts 中实现cloudfare的workers，接收客户端参数，然后调用deepseek的api，然后将结果返回给客户端

---

_**Assistant**_

让我帮您实现这个功能。我们需要修改 index.ts 文件来实现与 Deepseek API 的集成。

首先，我们需要在 Env 接口中添加 DEEPSEEK_API_KEY 环境变量，并实现主要的处理逻辑。

```typescript:src/index.ts
export interface Env {
	// ... existing code ...
	DEEPSEEK_API_KEY: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DeepseekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
    // 只处理 POST 请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // 解析请求体
      const { message } = await request.json();
      
      if (!message) {
        return new Response('Message is required', { status: 400 });
      }

      // 准备发送给 Deepseek 的数据
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: message
        }
      ];

      // 调用 Deepseek API
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.statusText}`);
      }

      const data: DeepseekResponse = await response.json();

      // 返回处理后的响应
      return new Response(JSON.stringify({
        response: data.choices[0].message.content
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({
        error: error.message || 'Internal Server Error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
	},
};
```

为了使这段代码正常工作，您还需要：

1. 在 Cloudflare Workers 的环境变量中设置 DEEPSEEK_API_KEY：

```bash
wrangler secret put DEEPSEEK_API_KEY
```

2. 在 wrangler.toml 中添加配置（如果还没有这个文件）：

```toml:wrangler.toml
name = "deepseek-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
# 这里可以添加其他环境变量
```

使用说明：
1. 客户端可以通过发送 POST 请求来使用这个 API
2. 请求体格式应该是：
```json
{
  "message": "你的问题或提示"
}
```

3. 响应格式将是：
```json
{
  "response": "API 返回的结果"
}
```

如果发生错误，将返回：
```json
{
  "error": "错误信息"
}
```

这个实现包含了：
- 错误处理
- CORS 支持
- 请求验证
- 类型安全
- 环境变量配置

您可以通过以下命令来测试和部署：
```bash
# 本地测试
wrangler dev

# 部署到 Cloudflare
wrangler deploy
```

需要注意的是，在使用之前请确保：
1. 您有有效的 Deepseek API key
2. 已经正确配置了环境变量
3. 有足够的 API 调用配额

---

_**User**_

我调用的时候，提示这个跨域问题

---

_**Assistant**_

看到您遇到了 CORS (跨域资源共享) 的问题。我们需要在 Workers 中正确处理 CORS 预检请求（OPTIONS 请求）。让我修改一下 index.ts 文件：

```typescript:src/index.ts
export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		// 处理 CORS 预检请求
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// ... existing code ...
		try {
			// 解析请求体
			const { message } = await request.json() as { message: string };
			
			if (!message) {
				return new Response('Message is required', { 
					status: 400,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Content-Type': 'application/json',
					}
				});
			}

			// ... existing code ...

			// 调用 Deepseek API
			const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
				},
				body: JSON.stringify({
					messages: messages,
				}),
			});

			if (!response.ok) {
				throw new Error(`Deepseek API error: ${response.statusText}`);
			}

			const data = await response.json() as DeepseekResponse;

			// 返回处理后的响应
			return new Response(JSON.stringify({
				response: data.choices[0].message.content
			}), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});

		} catch (error) {
			// 错误处理
			return new Response(JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal Server Error'
			}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}
	},
};
```

主要更改包括：

1. 添加了对 OPTIONS 预检请求的处理
2. 在所有响应中添加了完整的 CORS 头部
3. 添加了更多的 CORS 相关头部：
   - Access-Control-Allow-Methods
   - Access-Control-Allow-Headers
   - Access-Control-Max-Age

这些更改应该能解决跨域问题。确保您的前端代码在发送请求时包含正确的 Content-Type 头部：

```javascript
fetch('your-worker-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'your message'
  })
});
```

这样修改后，您的 API 应该可以正常处理来自其他域的请求了。

---

_**User**_

当我请求的时候，报这个错误

---

_**Assistant**_

看起来是请求格式的问题。让我们检查一下 API 的调用。我们需要在调用 Deepseek API 时添加必要的参数。让我修改一下代码：

```typescript:src/index.ts
// ... existing code ...

			// 调用 Deepseek API
			const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
				},
				body: JSON.stringify({
					model: 'deepseek-chat',  // 添加必需的 model 参数
					messages: messages,
					temperature: 0.7,        // 添加温度参数
					max_tokens: 2000,        // 添加最大令牌数
					stream: false            // 设置为非流式响应
				}),
			});

// ... existing code ...
```

主要更改：
1. 添加了必需的 `model` 参数
2. 添加了 `temperature` 控制响应的随机性
3. 添加了 `max_tokens` 限制响应长度
4. 添加了 `stream` 参数指定非流式响应

同时，为了更好地调试问题，我们可以增加更详细的错误处理：

```typescript:src/index.ts
			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(
					`Deepseek API error: ${response.statusText}\n${
						errorData ? JSON.stringify(errorData) : 'No error details'
					}`
				);
			}
```

如果您仍然遇到问题，请检查：

1. 确保 `DEEPSEEK_API_KEY` 环境变量已正确设置且有效
2. 确保前端发送请求时的格式正确：

```javascript
fetch('your-worker-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: '你的问题'  // 确保 message 字段名称正确
  })
});
```

如果还有问题，建议：
1. 检查 Cloudflare Workers 的日志以查看详细错误信息
2. 确认 Deepseek API 的接入点 URL 是否正确
3. 验证 API key 的权限是否足够

---



---


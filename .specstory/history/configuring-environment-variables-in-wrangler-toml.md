## SpecStory

## Configuring Environment Variables in wrangler.toml (2025/3/5 17:43:54)

_**User**_

@wrangler.toml 我是通过clarefare的wrangler来本地调试的，然后需要在 wrangler.toml中配置环境变量占位使用的，那么我需要在这里维护实际的变量值吗？

---

_**Assistant**_

```思路分析
[!code-start]
# 环境变量配置最佳实践分析
1. 本地开发环境配置
2. 生产环境配置
3. 安全性考虑
[!code-end]
```

```建议方案
[!code-start]
对于 wrangler.toml 中的环境变量配置,建议采用以下处理方式:

1. 本地开发环境:
- 创建 .dev.vars 文件存储本地开发环境变量
- 将 .dev.vars 添加到 .gitignore

2. 生产环境:
- wrangler.toml 中只保留变量占位
- 通过 Cloudflare Dashboard 或 wrangler secret 命令设置实际值

3. 安全考虑:
- 敏感信息不要直接写入代码仓库
- 使用环境变量分离配置
[!code-end]
```

具体建议的修改如下:

```toml:wrangler.toml
name = "aiworkers"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
# 生产环境通过 Cloudflare Dashboard 设置
DEEPSEEK_API_KEY = ""
# 其他环境变量占位
# ANOTHER_API_KEY = ""
```

然后创建一个 .dev.vars 文件用于本地开发:

```plaintext:.dev.vars
DEEPSEEK_API_KEY=your_local_dev_key_here
# ANOTHER_API_KEY=another_local_value
```

主要建议:

1. wrangler.toml 中只保留变量声明,不包含实际值
2. 本地开发时使用 .dev.vars 存储实际的开发环境变量值
3. 生产环境的值通过以下方式之一设置:
   - Cloudflare Dashboard 界面配置
   - 使用 `wrangler secret put DEEPSEEK_API_KEY` 命令
4. 将 .dev.vars 添加到 .gitignore 以避免提交敏感信息

这样可以:
- 保护敏感信息安全
- 分离开发和生产环境配置
- 便于团队协作和部署管理

---

_**User**_

@index.ts 那么在开发调试阶段，是否要让代码去读取？

---

_**Assistant**_

是的，为了让本地开发调试顺利进行，我们需要调整代码来适配本地开发环境。

```思路分析
[!code-start]
# 开发环境适配方案
1. 环境判断
2. 环境变量读取逻辑
3. 错误处理优化
[!code-end]
```

建议对 index.ts 做如下修改：

```typescript:src/index.ts
// ... existing code ...

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

		try {
			// 验证 API Key 是否存在
			if (!env.DEEPSEEK_API_KEY) {
				throw new Error(
					'DEEPSEEK_API_KEY not found. ' +
					'Please set it in .dev.vars for local development ' +
					'or in Cloudflare Dashboard for production.'
				);
			}

			// ... existing code ...

		} catch (error) {
			console.error('Error:', error); // 添加错误日志
			return new Response(JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal Server Error',
				tip: '如果是本地开发，请确保在 .dev.vars 文件中设置了 DEEPSEEK_API_KEY'
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

主要更新：

1. 添加了 API Key 存在性检查
2. 优化了错误提示信息，包含本地开发提示
3. 添加了错误日志输出

本地开发时的工作流程：

1. 确保已创建 `.dev.vars` 文件并设置了正确的 API Key：
```plaintext:.dev.vars
DEEPSEEK_API_KEY=your_api_key_here
```

2. 使用 wrangler 启动本地开发服务器：
```bash
wrangler dev src/index.ts
```

wrangler 会自动读取 `.dev.vars` 文件中的环境变量，使其在本地开发环境中可用。

这样的设置可以：
- 确保本地开发和生产环境的一致性
- 提供更友好的错误提示
- 保护敏感信息安全
- 简化开发调试流程

---

_**User**_

为防止接口被刷，我需要控制这个接口仅支持白名单下的域名来调用

---

_**Assistant**_



```思路分析
[!code-start]
# 域名白名单控制方案
1. 配置白名单列表
2. CORS 请求控制
3. Origin 验证逻辑
4. 错误处理完善
[!code-end]
```

首先需要在 wrangler.toml 中添加白名单配置：

```toml:wrangler.toml
name = "aiworkers"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
DEEPSEEK_API_KEY = ""
# 添加允许的域名白名单，使用逗号分隔
ALLOWED_ORIGINS = "http://localhost:3000,https://yourdomain.com"
```

然后修改 index.ts 添加域名验证逻辑：

```typescript:src/index.ts
export interface Env {
	DEEPSEEK_API_KEY: string;
	ALLOWED_ORIGINS: string; // 添加白名单环境变量
}

// ... existing code ...

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		// 获取请求来源
		const origin = request.headers.get('Origin') || '';
		const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || [];
		
		// 验证来源是否在白名单中
		if (!allowedOrigins.includes(origin)) {
			return new Response('Forbidden: Origin not allowed', {
				status: 403,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		// 处理 CORS 预检请求
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': origin, // 替换为具体的允许域名
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		try {
			// 验证 API Key 是否存在
			if (!env.DEEPSEEK_API_KEY) {
				throw new Error(
					'DEEPSEEK_API_KEY not found. ' +
					'Please set it in .dev.vars for local development ' +
					'or in Cloudflare Dashboard for production.'
				);
			}

			// ... existing code ...

			// 修改所有 Response 的 CORS 头
			return new Response(JSON.stringify({
				response: data.choices[0]?.message?.content || 'No response'
			}), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': origin, // 替换为具体的允许域名
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});

		} catch (error) {
			console.error('Error:', error);
			return new Response(JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal Server Error',
				tip: '如果是本地开发，请确保在 .dev.vars 文件中设置了 DEEPSEEK_API_KEY'
			}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': origin, // 替换为具体的允许域名
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}
	},
};
```

同时在 .dev.vars 中也需要添加本地开发的白名单配置：

```plaintext:.dev.vars
DEEPSEEK_API_KEY=your_api_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

主要更新内容：

1. 添加了白名单环境变量定义
2. 增加了域名验证逻辑
3. 将通配符 '*' 替换为具体的允许域名
4. 优化了 CORS 响应头设置

这样的设置可以：
- 限制只有白名单内的域名可以访问接口
- 提供更安全的 CORS 配置
- 灵活配置不同环境的允许域名
- 保持开发环境的便利性

注意事项：
1. 确保生产环境在 Cloudflare Dashboard 中正

---



---


/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
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
					max_tokens: 2000,
					stream: false
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(
					`Deepseek API error: ${response.statusText}\n${
						errorData ? JSON.stringify(errorData) : 'No error details'
					}`
				);
			}

			const data = await response.json() as DeepseekResponse;

			// 返回处理后的响应
			return new Response(JSON.stringify({
				response: data.choices[0]?.message?.content || 'No response'
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

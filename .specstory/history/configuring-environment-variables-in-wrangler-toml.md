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



---


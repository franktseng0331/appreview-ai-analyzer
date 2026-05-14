# AppReview AI Analyzer

本地部署的 Google Play 应用评论 AI 分析工具，用于竞品研究。通过抓取 Google Play 评论（或导入 CSV），利用 DeepSeek 大模型进行结构化分类，生成包含情感分析、痛点层级、使用场景画像、竞品迁移信号等维度的完整分析报告。

## 功能特性

- Google Play 评论自动抓取（支持多语言、多地区）
- CSV 评论导入
- DeepSeek AI 自动翻译 + 结构化分类
- 多维度分析报告（情感分布、主题交叉、痛点层级、功能需求、使用场景、竞品迁移等）
- 任务队列管理（创建、取消、重试）
- 数据本地存储（SQLite）

## 环境要求

- **Node.js >= 18**（推荐 20+，项目使用 ES Modules）
- **npm**（随 Node.js 一起安装）
- **网络代理**（如果你在中国大陆，访问 Google Play 需要代理，详见下方说明）
- **DeepSeek API Key**（必须，用于 AI 分析）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/appreview-ai-analyzer.git
cd appreview-ai-analyzer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`，填入你的配置：

```env
DEEPSEEK_API_KEY="你的DeepSeek API Key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL_FAST="deepseek-v4-flash"
DEEPSEEK_MODEL_REPORT="deepseek-v4-pro"

PORT=8787
HOST="127.0.0.1"
DATABASE_PATH="./data/appreview.sqlite"
LLM_BATCH_SIZE=24
LLM_CONCURRENCY=2
```

### 4. 启动开发模式

```bash
npm run dev
```

- 前端页面：`http://localhost:3000`
- 后端 API：`http://127.0.0.1:8787`

### 5. 生产模式运行

```bash
npm run build
npm run start
```

Fastify 服务器会同时提供 API 和前端静态文件，访问 `http://127.0.0.1:8787` 即可。

## DeepSeek API Key 申请

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 进入「API Keys」页面，创建一个新的 API Key
4. 将 Key 复制到 `.env.local` 的 `DEEPSEEK_API_KEY` 字段

> DeepSeek API 按 token 计费，分析 500 条评论大约消耗 ¥0.5-2 元（取决于评论长度和模型选择）。

## 网络代理配置（中国大陆用户）

抓取 Google Play 评论需要能访问 `play.google.com`。如果你在中国大陆，需要配置代理。

**方式一：系统代理自动检测（macOS）**

程序启动时会自动读取 macOS 系统代理设置（通过 `scutil --proxy`），无需额外配置。确保你的系统代理已开启即可。

**方式二：手动配置环境变量**

在 `.env.local` 中添加：

```env
GOOGLE_PLAY_HTTP_PROXY="http://127.0.0.1:7890"
GOOGLE_PLAY_HTTPS_PROXY="http://127.0.0.1:7890"
```

将 `7890` 替换为你本地代理的实际端口。

**方式三：使用 CSV 导入（无需代理）**

如果无法配置代理，可以通过其他方式获取评论数据后，以 CSV 格式导入分析。CSV 需包含表头，支持的列名：`content/text/review`、`rating/score`、`date`、`username/user`、`language`、`country` 等。

## 项目结构

```
├── server/           # Fastify 后端
│   ├── index.ts      # API 路由
│   ├── db.ts         # SQLite 数据层
│   ├── jobs.ts       # 任务队列与分析流程
│   ├── deepseek.ts   # DeepSeek API 调用
│   ├── googlePlay.ts # Google Play 评论抓取
│   ├── report.ts     # 报告数据聚合
│   ├── enrichment.ts # 文本清洗与去重
│   ├── csvImport.ts  # CSV 导入解析
│   └── ...
├── src/              # React 前端
│   ├── components/   # UI 组件
│   ├── api.ts        # 前端 API 客户端
│   └── ...
├── shared/           # 前后端共享类型
├── config/           # 分析规则字典
├── .env.example      # 环境变量模板
└── package.json
```

## 常见问题

**Q: 启动后提示 Google Play 不可达？**

A: 需要配置代理，参考上方「网络代理配置」部分。或者使用 CSV 导入模式。

**Q: 分析速度慢？**

A: 可以调整 `.env.local` 中的 `LLM_BATCH_SIZE`（每批发送给 AI 的评论数）和 `LLM_CONCURRENCY`（并发请求数）。增大这两个值可以加速，但注意 DeepSeek API 的速率限制。

**Q: 数据存在哪里？**

A: 所有数据存储在本地 `data/appreview.sqlite`，不会上传到任何远程服务器。

**Q: 支持哪些评论来源？**

A: 目前支持 Google Play 在线抓取和 CSV 文件导入两种方式。

## License

[MIT](LICENSE)

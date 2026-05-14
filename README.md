# AppReview AI Analyzer

[中文](#中文) | [English](#english)

---

<a id="中文"></a>

## 中文

本地部署的 Google Play 应用评论 AI 分析工具，用于竞品研究。通过抓取 Google Play 评论（或导入 CSV），利用 DeepSeek 大模型进行结构化分类，生成包含情感分析、痛点层级、使用场景画像、竞品迁移信号等维度的完整分析报告。

### 功能特性

- Google Play 评论自动抓取（支持多语言、多地区）
- CSV 评论导入
- DeepSeek AI 自动翻译 + 结构化分类
- 多维度分析报告（情感分布、主题交叉、痛点层级、功能需求、使用场景、竞品迁移等）
- 任务队列管理（创建、取消、重试）
- 数据本地存储（SQLite）

### 环境要求

- **Node.js >= 18**（推荐 20+，项目使用 ES Modules）
- **npm**（随 Node.js 一起安装）
- **网络代理**（如果你在中国大陆，访问 Google Play 需要代理，详见下方说明）
- **DeepSeek API Key**（必须，用于 AI 分析）

### 快速开始

#### 1. 安装 Node.js

**macOS：**

推荐使用 Homebrew：

```bash
brew install node
```

或从 [Node.js 官网](https://nodejs.org/) 下载 macOS 安装包。

**Windows：**

从 [Node.js 官网](https://nodejs.org/) 下载 Windows 安装包（.msi），双击安装，安装时勾选「Add to PATH」。

安装完成后打开终端（macOS: Terminal / Windows: PowerShell）验证：

```bash
node --version
npm --version
```

#### 2. 克隆项目

```bash
git clone https://github.com/franktseng0331/appreview-ai-analyzer.git
cd appreview-ai-analyzer
```

#### 3. 安装依赖

```bash
npm install
```

#### 4. 配置环境变量

**macOS / Linux：**

```bash
cp .env.example .env.local
```

**Windows (PowerShell)：**

```powershell
Copy-Item .env.example .env.local
```

然后用文本编辑器打开 `.env.local`，填入你的配置：

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

#### 5. 启动开发模式

```bash
npm run dev
```

- 前端页面：`http://localhost:3000`
- 后端 API：`http://127.0.0.1:8787`

#### 6. 生产模式运行

```bash
npm run build
npm run start
```

Fastify 服务器会同时提供 API 和前端静态文件，访问 `http://127.0.0.1:8787` 即可。

### DeepSeek API Key 申请

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 进入「API Keys」页面，创建一个新的 API Key
4. 将 Key 复制到 `.env.local` 的 `DEEPSEEK_API_KEY` 字段

> DeepSeek API 按 token 计费，分析 500 条评论大约消耗 ¥0.5-2 元（取决于评论长度和模型选择）。

### 网络代理配置（中国大陆用户）

抓取 Google Play 评论需要能访问 `play.google.com`。如果你在中国大陆，需要配置代理。

**方式一：系统代理自动检测（仅 macOS）**

程序启动时会自动读取 macOS 系统代理设置（通过 `scutil --proxy`），无需额外配置。确保你的系统代理已开启即可。

**方式二：手动配置环境变量（macOS / Windows 通用）**

在 `.env.local` 中添加：

```env
GOOGLE_PLAY_HTTP_PROXY="http://127.0.0.1:7890"
GOOGLE_PLAY_HTTPS_PROXY="http://127.0.0.1:7890"
```

将 `7890` 替换为你本地代理软件（如 Clash、V2Ray 等）的实际 HTTP 端口。

**方式三：使用 CSV 导入（无需代理）**

如果无法配置代理，可以通过其他方式获取评论数据后，以 CSV 格式导入分析。CSV 需包含表头，支持的列名：`content/text/review`、`rating/score`、`date`、`username/user`、`language`、`country` 等。

### 项目结构

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

### 常见问题

**Q: 启动后提示 Google Play 不可达？**

A: 需要配置代理，参考上方「网络代理配置」部分。或者使用 CSV 导入模式。

**Q: Windows 上 `npm install` 报错 better-sqlite3 编译失败？**

A: better-sqlite3 需要 C++ 编译工具。运行以下命令安装：

```powershell
npm install -g windows-build-tools
```

或安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选「C++ 桌面开发」工作负载。

**Q: 分析速度慢？**

A: 可以调整 `.env.local` 中的 `LLM_BATCH_SIZE`（每批发送给 AI 的评论数）和 `LLM_CONCURRENCY`（并发请求数）。增大这两个值可以加速，但注意 DeepSeek API 的速率限制。

**Q: 数据存在哪里？**

A: 所有数据存储在本地 `data/appreview.sqlite`，不会上传到任何远程服务器。

**Q: 支持哪些评论来源？**

A: 目前支持 Google Play 在线抓取和 CSV 文件导入两种方式。

---

<a id="english"></a>

## English

A locally deployed Google Play app review AI analysis tool for competitor research. It scrapes Google Play reviews (or imports CSV), uses DeepSeek LLM for structured classification, and generates comprehensive reports covering sentiment analysis, pain point hierarchy, use case profiling, competitor migration signals, and more.

### Features

- Automatic Google Play review scraping (multi-language, multi-region)
- CSV review import
- DeepSeek AI auto-translation + structured classification
- Multi-dimensional analysis reports (sentiment distribution, topic cross-analysis, pain hierarchy, feature requests, use cases, competitor migration, etc.)
- Job queue management (create, cancel, retry)
- Local data storage (SQLite)

### Requirements

- **Node.js >= 18** (20+ recommended; the project uses ES Modules)
- **npm** (bundled with Node.js)
- **Network proxy** (required in China mainland to access Google Play; see below)
- **DeepSeek API Key** (required for AI analysis)

### Quick Start

#### 1. Install Node.js

**macOS:**

Using Homebrew:

```bash
brew install node
```

Or download the macOS installer from [nodejs.org](https://nodejs.org/).

**Windows:**

Download the Windows installer (.msi) from [nodejs.org](https://nodejs.org/). During installation, make sure "Add to PATH" is checked.

Verify installation in your terminal (macOS: Terminal / Windows: PowerShell):

```bash
node --version
npm --version
```

#### 2. Clone the Repository

```bash
git clone https://github.com/franktseng0331/appreview-ai-analyzer.git
cd appreview-ai-analyzer
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Configure Environment Variables

**macOS / Linux:**

```bash
cp .env.example .env.local
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in a text editor and fill in your configuration:

```env
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL_FAST="deepseek-v4-flash"
DEEPSEEK_MODEL_REPORT="deepseek-v4-pro"

PORT=8787
HOST="127.0.0.1"
DATABASE_PATH="./data/appreview.sqlite"
LLM_BATCH_SIZE=24
LLM_CONCURRENCY=2
```

#### 5. Start Development Mode

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://127.0.0.1:8787`

#### 6. Production Mode

```bash
npm run build
npm run start
```

The Fastify server serves both the API and the built frontend at `http://127.0.0.1:8787`.

### Getting a DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Register and log in
3. Go to the "API Keys" page and create a new key
4. Paste the key into the `DEEPSEEK_API_KEY` field in `.env.local`

> DeepSeek API is billed per token. Analyzing 500 reviews costs approximately ¥0.5-2 (~$0.07-0.28 USD) depending on review length and model choice.

### Proxy Configuration (China Mainland Users)

Scraping Google Play reviews requires access to `play.google.com`. If you are in China mainland, you need a proxy.

**Option 1: Automatic system proxy detection (macOS only)**

The app automatically reads macOS system proxy settings via `scutil --proxy` on startup. Just make sure your system proxy is enabled.

**Option 2: Manual environment variable (macOS / Windows)**

Add to `.env.local`:

```env
GOOGLE_PLAY_HTTP_PROXY="http://127.0.0.1:7890"
GOOGLE_PLAY_HTTPS_PROXY="http://127.0.0.1:7890"
```

Replace `7890` with the actual HTTP port of your local proxy software (e.g., Clash, V2Ray).

**Option 3: CSV import (no proxy needed)**

If you cannot configure a proxy, export reviews through other means and import them as CSV. The CSV must include a header row. Supported column names: `content/text/review`, `rating/score`, `date`, `username/user`, `language`, `country`, etc.

### Project Structure

```
├── server/           # Fastify backend
│   ├── index.ts      # API routes
│   ├── db.ts         # SQLite data layer
│   ├── jobs.ts       # Job queue & analysis pipeline
│   ├── deepseek.ts   # DeepSeek API calls
│   ├── googlePlay.ts # Google Play review scraping
│   ├── report.ts     # Report data aggregation
│   ├── enrichment.ts # Text cleaning & deduplication
│   ├── csvImport.ts  # CSV import parser
│   └── ...
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── api.ts        # Frontend API client
│   └── ...
├── shared/           # Shared types (frontend & backend)
├── config/           # Analysis rule dictionaries
├── .env.example      # Environment variable template
└── package.json
```

### FAQ

**Q: "Google Play is not reachable" error on startup?**

A: You need to configure a proxy. See the "Proxy Configuration" section above, or use CSV import mode instead.

**Q: `npm install` fails on Windows with better-sqlite3 compilation error?**

A: better-sqlite3 requires C++ build tools. Run:

```powershell
npm install -g windows-build-tools
```

Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the "Desktop development with C++" workload.

**Q: Analysis is slow?**

A: Adjust `LLM_BATCH_SIZE` (reviews per AI batch) and `LLM_CONCURRENCY` (concurrent requests) in `.env.local`. Increasing these values speeds up analysis but may hit DeepSeek API rate limits.

**Q: Where is data stored?**

A: All data is stored locally in `data/appreview.sqlite`. Nothing is uploaded to any remote server.

**Q: What review sources are supported?**

A: Currently supports Google Play online scraping and CSV file import.

---

## License

[MIT](LICENSE)

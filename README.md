# AppReview AI Analyzer

[中文教程](#中文教程) | [English Guide](#english-guide)

---

<a id="中文教程"></a>

## 中文教程

本地部署的 Google Play 应用评论 AI 分析工具，用于竞品研究。通过抓取 Google Play 评论（或导入 CSV），利用 DeepSeek 大模型进行结构化分类，生成包含情感分析、痛点层级、使用场景画像、竞品迁移信号等维度的完整分析报告。

### 功能特性

- Google Play 评论自动抓取（支持多语言、多地区）
- CSV 评论导入
- DeepSeek AI 自动翻译 + 结构化分类
- 多维度分析报告（情感分布、主题交叉、痛点层级、功能需求、使用场景、竞品迁移等）
- 任务队列管理（创建、取消、重试）
- 数据本地存储（SQLite），所有数据保存在你自己电脑上

---

### 第一步：安装 Git

Git 是一个代码版本管理工具，你需要它来下载本项目的代码。

#### macOS 安装 Git

macOS 通常自带 Git。打开「终端」（在启动台搜索 "Terminal"），输入：

```bash
git --version
```

如果显示版本号（如 `git version 2.x.x`），说明已安装，跳到下一步。

如果提示未安装，系统会弹窗询问是否安装 Xcode Command Line Tools，点击「安装」即可。

#### Windows 安装 Git

1. 打开浏览器，访问 https://git-scm.com/download/win
2. 页面会自动开始下载安装包，如果没有，点击「Click here to download manually」
3. 双击下载的 `.exe` 文件
4. 安装过程中一路点「Next」使用默认设置即可
5. 安装完成后，在桌面或开始菜单右键，应该能看到「Git Bash」选项

验证安装（打开 PowerShell 或 Git Bash）：

```bash
git --version
```

看到版本号即表示安装成功。

---

### 第二步：安装 Node.js

Node.js 是运行本项目的环境。安装 Node.js 时会自动安装 npm（包管理工具）。

#### macOS 安装 Node.js

**方法一：从官网下载（推荐新手）**

1. 打开浏览器，访问 https://nodejs.org/
2. 点击左侧的 **LTS**（长期支持版）按钮下载
3. 双击下载的 `.pkg` 文件
4. 按照安装向导一路点「继续」直到完成

**方法二：使用 Homebrew（如果你已经安装了 Homebrew）**

```bash
brew install node
```

#### Windows 安装 Node.js

1. 打开浏览器，访问 https://nodejs.org/
2. 点击左侧的 **LTS**（长期支持版）按钮下载 `.msi` 安装包
3. 双击运行安装包
4. 安装过程中注意以下几点：
   - 勾选 **「Add to PATH」**（非常重要，否则命令行找不到 node）
   - 如果看到 **「Automatically install the necessary tools」** 选项，建议勾选（这会安装 C++ 编译工具，后面需要用到）
5. 点击「Install」等待安装完成

#### 验证安装

安装完成后，**关闭并重新打开**终端（macOS: Terminal / Windows: PowerShell），输入：

```bash
node --version
```

应该显示类似 `v20.x.x` 或 `v22.x.x` 的版本号。

```bash
npm --version
```

应该显示类似 `10.x.x` 的版本号。

> 如果提示「不是内部或外部命令」或「command not found」，说明 PATH 没有配置好。Windows 用户请重新运行安装包，确保勾选了「Add to PATH」；macOS 用户请重启终端。

---

### 第三步：下载项目代码

打开终端，输入以下命令：

```bash
git clone https://github.com/franktseng0331/appreview-ai-analyzer.git
```

这会在当前目录下创建一个 `appreview-ai-analyzer` 文件夹。然后进入项目目录：

```bash
cd appreview-ai-analyzer
```

> **Windows 用户提示：** 建议在一个简单的路径下操作，比如 `C:\Users\你的用户名\Desktop`。打开 PowerShell 后先输入 `cd Desktop` 再执行上面的 clone 命令。

> **不会用 Git？** 你也可以直接在 GitHub 页面点击绿色的「Code」按钮 → 「Download ZIP」，下载后解压到任意位置，然后在终端中 `cd` 到解压后的文件夹。

---

### 第四步：安装项目依赖

在项目目录下运行：

```bash
npm install
```

这个命令会自动下载项目需要的所有第三方库，可能需要 1-3 分钟，取决于网络速度。

> **Windows 用户注意：** 如果报错提示 `better-sqlite3` 编译失败，说明缺少 C++ 编译工具。解决方法：
>
> 1. 以管理员身份打开 PowerShell（右键 PowerShell → 以管理员身份运行）
> 2. 运行：`npm install -g windows-build-tools`
> 3. 等待安装完成（可能需要几分钟）
> 4. 关闭 PowerShell，重新打开，再次运行 `npm install`
>
> 如果上面的方法不行，可以手动安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，安装时勾选「使用 C++ 的桌面开发」工作负载。

---

### 第五步：申请 DeepSeek API Key

本工具使用 DeepSeek 大模型来分析评论，你需要一个 API Key。

1. 打开浏览器，访问 https://platform.deepseek.com/
2. 点击「注册」，用手机号或邮箱注册一个账号
3. 登录后，点击左侧菜单的「API Keys」
4. 点击「创建 API Key」按钮
5. 给 Key 起个名字（随便填，比如 "appreview"），点击确认
6. **立即复制生成的 Key**（它只显示一次！如果忘记复制，删掉重新创建一个就行）

> **费用说明：** DeepSeek 新注册用户通常有免费额度。即使付费，分析 500 条评论大约只需 ¥0.5-2 元，非常便宜。

---

### 第六步：配置环境变量

环境变量文件用来存放你的私密配置（如 API Key），不会被上传到网上。

#### macOS / Linux

在终端中运行：

```bash
cp .env.example .env.local
```

然后用文本编辑器打开 `.env.local` 文件：

```bash
open .env.local
```

或者用 VS Code 打开：

```bash
code .env.local
```

#### Windows

在 PowerShell 中运行：

```powershell
Copy-Item .env.example .env.local
```

然后用记事本打开：

```powershell
notepad .env.local
```

#### 编辑配置

打开后你会看到如下内容，把 `YOUR_DEEPSEEK_API_KEY` 替换为你在第五步复制的 Key：

```env
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL_FAST="deepseek-v4-flash"
DEEPSEEK_MODEL_REPORT="deepseek-v4-pro"

PORT=8787
HOST="127.0.0.1"
DATABASE_PATH="./data/appreview.sqlite"
LLM_BATCH_SIZE=24
LLM_CONCURRENCY=2
```

只需要修改第一行的 `DEEPSEEK_API_KEY`，其他保持默认即可。修改后保存文件。

---

### 第七步：配置网络代理（中国大陆用户必读）

抓取 Google Play 评论需要能访问 `play.google.com`。如果你在中国大陆，需要配置代理。

#### 方式一：系统代理自动检测（仅 macOS）

如果你的 Mac 上已经开启了代理软件（如 ClashX、Surge 等），并且设置了系统代理，程序会自动检测并使用，无需额外配置。

#### 方式二：手动配置代理（macOS / Windows 通用，推荐）

如果你使用 Clash、V2Ray、Shadowsocks 等代理软件，找到它的 **HTTP 代理端口**（通常在软件设置中可以看到，常见端口：7890、1080、10809 等）。

在 `.env.local` 文件末尾添加两行：

```env
GOOGLE_PLAY_HTTP_PROXY="http://127.0.0.1:7890"
GOOGLE_PLAY_HTTPS_PROXY="http://127.0.0.1:7890"
```

把 `7890` 替换为你代理软件的实际端口号。

> **如何找到代理端口？**
> - **Clash / ClashX / Clash Verge：** 打开软件 → 设置/General → 找到「HTTP Port」或「Mixed Port」，通常是 7890
> - **V2Ray / V2RayN：** 打开软件 → 设置 → 本地监听端口，通常是 10809
> - **Shadowsocks：** 打开软件 → 偏好设置 → HTTP 代理端口，通常是 1080

#### 方式三：使用 CSV 导入（完全不需要代理）

如果你没有代理，也可以使用本工具。只是不能直接从 Google Play 抓取评论，需要通过 CSV 文件导入评论数据。

CSV 文件格式要求：
- 第一行必须是表头
- 必须包含评论内容列（列名可以是：`content`、`text`、`review` 中的任意一个）
- 可选列：`rating`（评分 1-5）、`date`（日期）、`username`（用户名）、`language`（语言）、`country`（国家）

示例 CSV：

```csv
content,rating,date,username
"This app is great for taking notes",5,2024-01-15,John
"Crashes every time I open it",1,2024-01-16,Jane
"Please add dark mode",3,2024-01-17,Bob
```

---

### 第八步：启动项目

一切配置完成后，在项目目录下运行：

```bash
npm run dev
```

你会看到终端输出类似：

```
[api] Server listening at http://127.0.0.1:8787
[web] Local: http://localhost:3000/
```

现在打开浏览器，访问 **http://localhost:3000** ，你应该能看到分析工具的界面了。

> **注意：** 运行期间不要关闭终端窗口。如果要停止程序，在终端按 `Ctrl + C`。

---

### 第九步：开始使用

1. 在界面左侧输入要分析的 Google Play 应用包名（例如 `com.todoist`）
2. 选择要抓取的评论语言和地区
3. 选择抓取数量（建议首次尝试选 100 条，速度较快）
4. 点击「开始分析」
5. 等待分析完成（100 条评论大约需要 1-3 分钟）
6. 分析完成后可以查看完整的多维度报告

> **如何找到应用包名？** 在 Google Play 网页版打开任意应用，URL 中 `id=` 后面的部分就是包名。例如：
> `https://play.google.com/store/apps/details?id=com.todoist` → 包名是 `com.todoist`

---

### 常见问题排查

#### 启动后提示 Google Play 不可达

需要配置代理，参考第七步。或者使用 CSV 导入模式。

#### `npm install` 报错

- **网络问题：** 如果下载慢或超时，可以设置 npm 镜像：
  ```bash
  npm config set registry https://registry.npmmirror.com
  ```
  然后重新运行 `npm install`。

- **Windows 编译错误（better-sqlite3）：** 参考第四步中的 Windows 用户注意事项。

- **权限问题（macOS）：** 如果提示 permission denied，在命令前加 `sudo`：
  ```bash
  sudo npm install
  ```

#### 端口被占用

如果提示 `EADDRINUSE` 端口被占用，修改 `.env.local` 中的 `PORT` 为其他值（如 `9090`），然后重新启动。

#### 分析速度慢

- 确保网络稳定
- 可以减小 `.env.local` 中的 `LLM_BATCH_SIZE`（如改为 12），降低单次请求大小
- 或增大 `LLM_CONCURRENCY`（如改为 3），提高并发数（注意不要超过 DeepSeek 的速率限制）

#### 页面打开是空白

确保前后端都在运行。终端中应该同时看到 `[api]` 和 `[web]` 的输出。如果只有一个在运行，按 `Ctrl + C` 停止后重新运行 `npm run dev`。

---

### 项目结构（了解即可）

```
appreview-ai-analyzer/
├── server/           # 后端代码（Fastify + SQLite）
│   ├── index.ts      # API 路由定义
│   ├── db.ts         # 数据库操作
│   ├── jobs.ts       # 分析任务队列
│   ├── deepseek.ts   # DeepSeek AI 调用
│   ├── googlePlay.ts # Google Play 评论抓取
│   ├── report.ts     # 报告数据聚合
│   ├── enrichment.ts # 文本清洗与去重
│   └── csvImport.ts  # CSV 导入解析
├── src/              # 前端代码（React）
│   ├── components/   # 界面组件
│   └── api.ts        # 前端请求封装
├── shared/           # 前后端共享的类型定义
├── config/           # 分析规则配置
├── data/             # 数据库文件（自动生成，不要删除）
├── .env.example      # 环境变量模板
├── .env.local        # 你的本地配置（不会上传）
└── package.json      # 项目依赖配置
```

---
---

<a id="english-guide"></a>

## English Guide

A locally deployed Google Play app review AI analysis tool for competitor research. It scrapes Google Play reviews (or imports CSV), uses DeepSeek LLM for structured classification, and generates comprehensive reports covering sentiment analysis, pain point hierarchy, use case profiling, competitor migration signals, and more.

### Features

- Automatic Google Play review scraping (multi-language, multi-region)
- CSV review import
- DeepSeek AI auto-translation + structured classification
- Multi-dimensional analysis reports (sentiment, topics, pain hierarchy, feature requests, use cases, competitor migration, etc.)
- Job queue management (create, cancel, retry)
- Local data storage (SQLite) — all data stays on your machine

---

### Step 1: Install Git

Git is a version control tool needed to download this project.

#### macOS

macOS usually comes with Git pre-installed. Open Terminal (search "Terminal" in Launchpad) and type:

```bash
git --version
```

If you see a version number (e.g., `git version 2.x.x`), you're good. Skip to the next step.

If prompted to install Xcode Command Line Tools, click "Install".

#### Windows

1. Visit https://git-scm.com/download/win
2. The download should start automatically
3. Run the downloaded `.exe` installer
4. Click "Next" through all steps using default settings
5. After installation, you should see "Git Bash" in your right-click context menu

Verify (open PowerShell or Git Bash):

```bash
git --version
```

---

### Step 2: Install Node.js

Node.js is the runtime environment for this project. Installing Node.js also installs npm (package manager).

#### macOS

**Option A: Download from website (recommended for beginners)**

1. Visit https://nodejs.org/
2. Click the **LTS** (Long Term Support) button to download
3. Double-click the downloaded `.pkg` file
4. Follow the installer wizard to completion

**Option B: Using Homebrew (if you have it installed)**

```bash
brew install node
```

#### Windows

1. Visit https://nodejs.org/
2. Click the **LTS** button to download the `.msi` installer
3. Run the installer
4. Important settings during installation:
   - Check **"Add to PATH"** (critical — without this, the terminal won't find node)
   - If you see **"Automatically install the necessary tools"**, check it (installs C++ build tools needed later)
5. Click "Install" and wait for completion

#### Verify Installation

**Close and reopen** your terminal (macOS: Terminal / Windows: PowerShell), then type:

```bash
node --version
```

You should see something like `v20.x.x` or `v22.x.x`.

```bash
npm --version
```

You should see something like `10.x.x`.

> If you get "not recognized as an internal or external command" or "command not found", the PATH wasn't configured properly. Windows users: re-run the installer and make sure "Add to PATH" is checked. macOS users: restart your terminal.

---

### Step 3: Download the Project

Open your terminal and run:

```bash
git clone https://github.com/franktseng0331/appreview-ai-analyzer.git
```

This creates an `appreview-ai-analyzer` folder. Enter it:

```bash
cd appreview-ai-analyzer
```

> **Windows tip:** Work in a simple path like `C:\Users\YourName\Desktop`. Open PowerShell, type `cd Desktop` first, then run the clone command.

> **Don't know Git?** You can also click the green "Code" button on the GitHub page → "Download ZIP", extract it anywhere, then `cd` into the extracted folder.

---

### Step 4: Install Dependencies

In the project directory, run:

```bash
npm install
```

This downloads all required libraries. It may take 1-3 minutes depending on your network.

> **Windows users:** If you get a `better-sqlite3` compilation error, you need C++ build tools:
>
> 1. Open PowerShell as Administrator (right-click → Run as Administrator)
> 2. Run: `npm install -g windows-build-tools`
> 3. Wait for installation to complete (may take a few minutes)
> 4. Close and reopen PowerShell, then run `npm install` again
>
> If that doesn't work, manually install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the "Desktop development with C++" workload.

---

### Step 5: Get a DeepSeek API Key

This tool uses DeepSeek LLM to analyze reviews. You need an API key.

1. Visit https://platform.deepseek.com/
2. Click "Sign Up" and register with your phone or email
3. After logging in, click "API Keys" in the left menu
4. Click "Create API Key"
5. Give it a name (anything, e.g., "appreview") and confirm
6. **Copy the generated key immediately** (it's only shown once! If you miss it, delete and create a new one)

> **Cost:** DeepSeek gives new users free credits. Even when paying, analyzing 500 reviews costs about ¥0.5-2 (~$0.07-0.28 USD). Very affordable.

---

### Step 6: Configure Environment Variables

The environment file stores your private settings (like the API key) and is never uploaded online.

#### macOS / Linux

```bash
cp .env.example .env.local
```

Open the file with a text editor:

```bash
open .env.local
```

Or with VS Code:

```bash
code .env.local
```

#### Windows (PowerShell)

```powershell
Copy-Item .env.example .env.local
```

Open with Notepad:

```powershell
notepad .env.local
```

#### Edit the Configuration

Replace `YOUR_DEEPSEEK_API_KEY` with the key you copied in Step 5:

```env
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL_FAST="deepseek-v4-flash"
DEEPSEEK_MODEL_REPORT="deepseek-v4-pro"

PORT=8787
HOST="127.0.0.1"
DATABASE_PATH="./data/appreview.sqlite"
LLM_BATCH_SIZE=24
LLM_CONCURRENCY=2
```

You only need to change the first line (`DEEPSEEK_API_KEY`). Keep everything else as default. Save the file.

---

### Step 7: Configure Network Proxy (China Mainland Users)

Scraping Google Play reviews requires access to `play.google.com`. If you're in China mainland, you need a proxy.

#### Option 1: Automatic system proxy (macOS only)

If your Mac already has proxy software running (e.g., ClashX, Surge) with system proxy enabled, the app detects it automatically. No extra configuration needed.

#### Option 2: Manual proxy configuration (macOS / Windows, recommended)

If you use Clash, V2Ray, Shadowsocks, etc., find the **HTTP proxy port** in your proxy software settings (common ports: 7890, 1080, 10809).

Add these two lines at the end of `.env.local`:

```env
GOOGLE_PLAY_HTTP_PROXY="http://127.0.0.1:7890"
GOOGLE_PLAY_HTTPS_PROXY="http://127.0.0.1:7890"
```

Replace `7890` with your actual proxy port.

> **How to find your proxy port:**
> - **Clash / ClashX / Clash Verge:** Open app → Settings/General → "HTTP Port" or "Mixed Port" (usually 7890)
> - **V2Ray / V2RayN:** Open app → Settings → Local listening port (usually 10809)
> - **Shadowsocks:** Open app → Preferences → HTTP proxy port (usually 1080)

#### Option 3: CSV import (no proxy needed at all)

If you don't have a proxy, you can still use this tool — just import review data via CSV instead of scraping Google Play directly.

CSV format requirements:
- First row must be headers
- Must include a review content column (named: `content`, `text`, or `review`)
- Optional columns: `rating` (1-5), `date`, `username`, `language`, `country`

Example CSV:

```csv
content,rating,date,username
"This app is great for taking notes",5,2024-01-15,John
"Crashes every time I open it",1,2024-01-16,Jane
"Please add dark mode",3,2024-01-17,Bob
```

---

### Step 8: Start the Project

With everything configured, run in the project directory:

```bash
npm run dev
```

You should see output like:

```
[api] Server listening at http://127.0.0.1:8787
[web] Local: http://localhost:3000/
```

Open your browser and visit **http://localhost:3000** — you should see the analysis tool interface.

> **Note:** Don't close the terminal window while using the tool. To stop the program, press `Ctrl + C` in the terminal.

---

### Step 9: Start Analyzing

1. Enter a Google Play app package name in the left panel (e.g., `com.todoist`)
2. Select review languages and regions to scrape
3. Choose the number of reviews (start with 100 for a quick test)
4. Click "Start Analysis"
5. Wait for completion (100 reviews takes about 1-3 minutes)
6. View the full multi-dimensional report when done

> **How to find an app's package name?** Open any app on the Google Play website. The part after `id=` in the URL is the package name. Example:
> `https://play.google.com/store/apps/details?id=com.todoist` → package name is `com.todoist`

---

### Troubleshooting

#### "Google Play is not reachable" error

Configure a proxy (see Step 7), or use CSV import mode.

#### `npm install` errors

- **Network issues:** If downloads are slow or timing out, set an npm mirror:
  ```bash
  npm config set registry https://registry.npmmirror.com
  ```
  Then run `npm install` again.

- **Windows compilation error (better-sqlite3):** See the Windows note in Step 4.

- **Permission denied (macOS):** Add `sudo` before the command:
  ```bash
  sudo npm install
  ```

#### Port already in use

If you see `EADDRINUSE`, change `PORT` in `.env.local` to another value (e.g., `9090`), then restart.

#### Analysis is slow

- Make sure your network is stable
- Reduce `LLM_BATCH_SIZE` in `.env.local` (e.g., set to 12) to lower per-request size
- Or increase `LLM_CONCURRENCY` (e.g., set to 3) for more parallel requests (don't exceed DeepSeek's rate limits)

#### Page is blank

Make sure both frontend and backend are running. You should see both `[api]` and `[web]` output in the terminal. If only one is running, press `Ctrl + C` and run `npm run dev` again.

---

### Project Structure (for reference)

```
appreview-ai-analyzer/
├── server/           # Backend (Fastify + SQLite)
│   ├── index.ts      # API route definitions
│   ├── db.ts         # Database operations
│   ├── jobs.ts       # Analysis job queue
│   ├── deepseek.ts   # DeepSeek AI calls
│   ├── googlePlay.ts # Google Play review scraping
│   ├── report.ts     # Report data aggregation
│   ├── enrichment.ts # Text cleaning & deduplication
│   └── csvImport.ts  # CSV import parser
├── src/              # Frontend (React)
│   ├── components/   # UI components
│   └── api.ts        # API request helpers
├── shared/           # Shared type definitions
├── config/           # Analysis rule configuration
├── data/             # Database files (auto-generated, don't delete)
├── .env.example      # Environment variable template
├── .env.local        # Your local config (never uploaded)
└── package.json      # Project dependency config
```

---

## License

[MIT](LICENSE)

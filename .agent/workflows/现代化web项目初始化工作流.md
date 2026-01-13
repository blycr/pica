---
description: 按照高标准美学初始化现代化Web项目 (Node/Vite + Tailwind + Premium UI)
---

# 现代化web项目初始化工作流

此工作流用于快速搭建一个高颜值、现代化的Web项目基础。

## 1. 初始化项目结构
// turbo
- 检查目录是否为空，非空则询问
- 使用 `pnpm init -y` 初始化
- 安装核心依赖：`vite` (或 `express`), `tailwindcss`, `postcss`, `autoprefixer`

## 2. 配置 Tailwind CSS
// turbo
- 生成 `tailwind.config.js` 和 `postcss.config.js`
- **关键配置**：
  - 开启 `darkMode: 'class'`
  - 扩展颜色板（使用 slate/zinc 等高级灰，以及 primary/secondary 语义色）
  - 配置字体（Inter, System UI）

## 3. 创建目录与基础文件
- 创建 `public/`, `src/` (或根据技术栈调整)
- 创建 `index.html`：
  - 必须包含 Meta viewport
  - 必须引入 Tailwind CSS
  - 必须设置深色模式支持的 `bg-slate-50 dark:bg-slate-900`

## 4. 注入 Premium CSS
- 创建 `main.css`
- 添加 `@tailwind base; components; utilities;`
- **添加自定义的一流交互效果**：
  - 滚动条美化
  - 玻璃拟态 (Glassmorphism) 类 `.glass`
  - 平滑过渡 `transition-all duration-300`
  - 如果是内容类应用，添加 `prose` (Typography)

## 5. 脚本配置
- 配置 `package.json` 中的 `dev`, `build`, `preview` 命令

## 6. 验证
- 此项交给用户自行操作
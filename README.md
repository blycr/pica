# Pica Manga - 局域网漫画预览系统

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

一个高颜值、现代化的局域网漫画预览与管理系统

[快速开始](#快速开始) • [功能特性](#功能特性) • [API 文档](./docs/API文档.md) • [项目概览](./docs/项目概览.md)

</div>

---

## ✨ 功能特性

### 已实现
- ✅ **文件扫描器**: 自动扫描本地漫画目录，支持多种目录结构
- ✅ **数据库缓存**: 使用 SQLite 存储漫画元数据，提升访问速度
- ✅ **标签系统**: 为漫画添加自定义标签，方便分类和查找
- ✅ **阅读历史**: 自动记录阅读进度，支持断点续读
- ✅ **收藏功能**: 收藏喜欢的漫画，快速访问
- ✅ **RESTful API**: 完整的后端 API，支持前后端分离
- ✅ **高级搜索**: 支持关键词搜索、多标签筛选、自动补全和搜索建议
- ✅ **缩略图生成**: 自动生成 WebP 格式缩略图，支持三种尺寸和智能缓存
- ✅ **漫画阅读器**: 流畅的阅读体验，支持垂直滚动和懒加载
- ✅ **响应式设计**: 玻璃拟态设计，适配桌面、平板和手机
- ✅ **多书库管理**: 支持添加多个本地目录作为独立书库

### 规划中
- 📋 **元数据匹配**: 自动从外部 API 获取漫画元数据 (MyAnimeList, etc.)
- 📋 **多用户支持**: 支持多个用户独立的阅读记录
- 📋 **推荐系统**: 基于标签和阅读历史的智能推荐

---

## 🚀 快速开始

详见 [快速开始](./docs/快速开始.md) 文档。

### 简易运行
1. **安装依赖**: `pnpm install`
2. **配置环境**: `cp .env.example .env`
3. **启动服务**: `pnpm start`
4. **访问**: 打开 `http://localhost:5173`

---

## 📁 项目结构

```
pica/
├── server/                    # 后端服务器
│   ├── index.js              # 服务器入口
│   ├── db/                   # 数据库模块
│   │   └── init.js          # 数据库初始化
│   ├── routes/               # API 路由
│   └── utils/                # 工具函数
├── src/                      # 前端源码
│   ├── main.js              # 前端逻辑入口
│   ├── main.css             # 全局样式
│   ├── api/                 # API 请求模块
│   ├── components/          # UI 组件
│   ├── pages/               # 页面模块
│   └── utils/               # 前端工具
├── docs/                     # 项目文档
│   ├── API文档.md
│   ├── 技术与架构.md
│   ├── 快速开始.md
│   ├── 项目概览.md
│   └── 待办事项.md
├── data/                     # 数据库和缓存（自动生成）
│   ├── pica.db              # SQLite 数据库
│   └── thumbnails/          # 缩略图缓存
├── index.html                # HTML 入口
└── package.json
```

---

## 🛠️ 技术栈

### 前端
- **构建工具**: Vite
- **样式框架**: Tailwind CSS v4
- **脚本语言**: JavaScript (Vanilla)

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite (better-sqlite3)
- **图片处理**: Sharp

---

## 📖 文档导航

- [项目概览](./docs/项目概览.md): 了解项目背景、进展和核心逻辑
- [快速开始](./docs/快速开始.md): 安装和启动指南
- [技术与架构](./docs/技术与架构.md): 系统架构、数据库设计与模块说明
- [API 文档](./docs/API文档.md): 后端接口详细说明
- [测试指南](./docs/测试指南.md): 功能测试流程
- [待办事项](./docs/待办事项.md): 开发计划与进度

---

## 🎯 支持的目录结构

见 [技术与架构 - 文件扫描器逻辑](./docs/技术与架构.md#文件扫描器逻辑)。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

<div align="center">
Made with ❤️ by Pica Team
</div>

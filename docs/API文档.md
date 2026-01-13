# API 文档

## 基础信息
- **Base URL**: `http://localhost:3000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 健康检查

### GET /api/health
检查服务器状态

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T14:43:00.000Z"
}
```

---

## 漫画管理 API

### 1. 获取漫画列表
**GET** `/api/manga`

**查询参数**:
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 20
- `search` (string): 搜索关键词
- `tag` (string): 按标签筛选
- `favorite` (boolean): 只显示收藏，值为 "true"

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "进击的巨人",
      "path": "/manga/attack-on-titan",
      "cover_path": "/manga/attack-on-titan/cover.jpg",
      "total_chapters": 139,
      "total_pages": 2000,
      "is_favorite": 1,
      "created_at": "2026-01-13 10:00:00",
      "updated_at": "2026-01-13 14:00:00",
      "last_read_at": "2026-01-13 14:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. 获取漫画详情
**GET** `/api/manga/:id`

**响应示例**:
```json
{
  "id": 1,
  "title": "进击的巨人",
  "path": "/manga/attack-on-titan",
  "cover_path": "/manga/attack-on-titan/cover.jpg",
  "total_chapters": 139,
  "total_pages": 2000,
  "is_favorite": 1,
  "chapters": [
    {
      "id": 1,
      "manga_id": 1,
      "chapter_number": 1,
      "title": "第1话",
      "path": "/manga/attack-on-titan/chapter-01",
      "page_count": 50
    }
  ],
  "tags": [
    {
      "id": 1,
      "name": "热血",
      "color": "#ff6b6b"
    }
  ],
  "lastRead": {
    "chapter_id": 1,
    "page_number": 10,
    "progress": 0.2
  }
}
```

### 3. 获取章节页面列表
**GET** `/api/manga/:id/chapters/:chapterId/pages`

**响应示例**:
```json
{
  "chapter": {
    "id": 1,
    "manga_id": 1,
    "chapter_number": 1,
    "title": "第1话",
    "path": "/manga/attack-on-titan/chapter-01",
    "page_count": 50
  },
  "pages": [
    {
      "page": 1,
      "filename": "001.jpg",
      "path": "/manga/attack-on-titan/chapter-01/001.jpg"
    }
  ],
  "totalPages": 50
}
```

### 4. 切换收藏状态
**POST** `/api/manga/:id/favorite`

**响应示例**:
```json
{
  "success": true,
  "is_favorite": 1
}
```

### 5. 更新阅读进度
**POST** `/api/manga/:id/progress`

**请求体**:
```json
{
  "chapterId": 1,
  "pageNumber": 10,
  "progress": 0.2
}
```

**响应示例**:
```json
{
  "success": true
}
```

### 6. 删除漫画
**DELETE** `/api/manga/:id`

**响应示例**:
```json
{
  "success": true
}
```

---

## 标签管理 API

### 1. 获取所有标签
**GET** `/api/tags`

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "热血",
    "color": "#ff6b6b",
    "manga_count": 15,
    "created_at": "2026-01-13 10:00:00"
  }
]
```

### 2. 创建标签
**POST** `/api/tags`

**请求体**:
```json
{
  "name": "热血",
  "color": "#ff6b6b"
}
```

**响应示例**:
```json
{
  "id": 1,
  "name": "热血",
  "color": "#ff6b6b",
  "created_at": "2026-01-13 10:00:00"
}
```

### 3. 更新标签
**PUT** `/api/tags/:id`

**请求体**:
```json
{
  "name": "热血动作",
  "color": "#ff8888"
}
```

### 4. 删除标签
**DELETE** `/api/tags/:id`

### 5. 为漫画添加标签
**POST** `/api/tags/:tagId/manga/:mangaId`

### 6. 移除漫画标签
**DELETE** `/api/tags/:tagId/manga/:mangaId`

### 7. 获取漫画的所有标签
**GET** `/api/tags/manga/:mangaId`

---

## 扫描器 API

### 1. 扫描目录
**POST** `/api/scanner/scan`

**请求体**:
```json
{
  "path": "D:/Manga",
  "mode": "library"  // 或 "single"
}
```

**响应示例**:
```json
{
  "success": true,
  "scanned": 50,
  "saved": 48,
  "results": [
    {
      "id": 1,
      "title": "进击的巨人",
      "path": "D:/Manga/attack-on-titan",
      "totalChapters": 139,
      "totalPages": 2000
    }
  ]
}
```

### 2. 重新扫描所有漫画
**POST** `/api/scanner/rescan`

**响应示例**:
```json
{
  "success": true,
  "total": 100,
  "updated": 95,
  "failed": 5,
  "results": [...]
}
```

### 3. 获取统计信息
**GET** `/api/scanner/stats`

**响应示例**:
```json
{
  "totalManga": 100,
  "totalChapters": 5000,
  "totalTags": 20,
  "favoriteManga": 15,
  "recentlyAdded": [...],
  "recentlyRead": [...]
}
```

---

## 历史记录与收藏夹 API

### 1. 获取继续阅读列表
**GET** `/api/history/continue-reading`

**查询参数**:
- `limit` (number): 返回数量，默认 10

**响应示例**:
```json
[
  {
    "id": 1,
    "title": "进击的巨人",
    "cover_path": "/manga/attack-on-titan/cover.jpg",
    "chapter_id": 5,
    "chapter_number": 5,
    "chapter_title": "第5话",
    "page_number": 10,
    "progress": 0.2,
    "read_at": "2026-01-14 10:00:00"
  }
]
```

### 2. 获取阅读历史记录
**GET** `/api/history`

**查询参数**:
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 20

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "manga_id": 1,
      "manga_title": "进击的巨人",
      "cover_path": "/manga/attack-on-titan/cover.jpg",
      "chapter_id": 5,
      "chapter_number": 5,
      "chapter_title": "第5话",
      "page_number": 10,
      "progress": 0.2,
      "read_at": "2026-01-14 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 3. 获取收藏夹列表
**GET** `/api/history/favorites`

**查询参数**:
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 20

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "进击的巨人",
      "cover_path": "/manga/attack-on-titan/cover.jpg",
      "total_chapters": 139,
      "is_favorite": 1,
      "updated_at": "2026-01-14 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 4. 清除阅读历史
**DELETE** `/api/history/clear`

**查询参数**:
- `olderThan` (number): 可选，只清除多少天前的记录

**响应示例**:
```json
{
  "success": true,
  "deleted": 50
}
```

### 5. 删除单条阅读历史
**DELETE** `/api/history/:id`

**响应示例**:
```json
{
  "success": true
}
```

---

## 错误响应格式

所有错误响应遵循以下格式：

```json
{
  "error": "错误描述信息"
}
```

常见 HTTP 状态码：
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

---

---

## 搜索 API

### 1. 高级搜索
**POST** `/api/search/advanced`

**请求体**:
```json
{
  "keyword": "进击",
  "tags": ["热血", "冒险"],
  "favorite": true,
  "sortBy": "updated_at",
  "sortOrder": "desc",
  "page": 1,
  "limit": 20
}
```

**响应示例**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  },
  "filters": {
    "keyword": "进击",
    "tags": ["热血", "冒险"],
    "favorite": true,
    "sortBy": "updated_at",
    "sortOrder": "DESC"
  }
}
```

### 2. 自动补全
**GET** `/api/search/autocomplete?q=进击`

**响应示例**:
```json
[
  {
    "id": 1,
    "title": "进击的巨人",
    "cover_path": "/path/to/cover.jpg"
  }
]
```

### 3. 搜索建议
**GET** `/api/search/suggestions`

**响应示例**:
```json
{
  "popularTags": [
    {
      "name": "热血",
      "color": "#ff6b6b",
      "count": 15
    }
  ],
  "recentlyRead": [...],
  "recentlyAdded": [...]
}
```

---

## 缩略图 API

### 1. 生成单个缩略图
**GET** `/api/thumbnails/generate?path=/path/to/image.jpg&size=medium`

返回缩略图文件（WebP格式）

### 2. 批量生成缩略图
**POST** `/api/thumbnails/batch`

**请求体**:
```json
{
  "mangaIds": [1, 2, 3],
  "size": "medium"
}
```

**响应示例**:
```json
{
  "success": true,
  "total": 3,
  "results": [
    {
      "original": "/path/to/cover.jpg",
      "thumbnail": "/path/to/thumbnail.webp",
      "status": "success"
    }
  ]
}
```

### 3. 为所有漫画生成缩略图
**POST** `/api/thumbnails/generate-all`

**请求体**:
```json
{
  "size": "medium"
}
```

### 4. 清理缩略图缓存
**DELETE** `/api/thumbnails/cache?maxAge=30`

### 5. 获取缩略图统计
**GET** `/api/thumbnails/stats`

**响应示例**:
```json
{
  "count": 150,
  "totalSize": 52428800,
  "totalSizeMB": "50.00"
}
```

---

## 扩展 API 规划

以下是未来可能添加的 API 端点：

### 用户系统
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/users/profile` - 获取用户信息

### 评论系统
- `GET /api/manga/:id/comments` - 获取漫画评论
- `POST /api/manga/:id/comments` - 添加评论

### 推荐系统
- `GET /api/recommendations` - 获取推荐漫画
- `GET /api/manga/:id/similar` - 获取相似漫画

### 导出/导入
- `POST /api/export` - 导出数据
- `POST /api/import` - 导入数据

---

## 书库管理 API

### 1. 获取所有书库
**GET** `/api/libraries`

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "主书库",
    "path": "D:/Manga",
    "description": "主要的漫画收藏",
    "is_active": 1,
    "manga_count": 150,
    "created_at": "2026-01-14 00:00:00",
    "updated_at": "2026-01-14 00:00:00"
  }
]
```

### 2. 获取单个书库详情
**GET** `/api/libraries/:id`

**响应示例**:
```json
{
  "id": 1,
  "name": "主书库",
  "path": "D:/Manga",
  "description": "主要的漫画收藏",
  "is_active": 1,
  "manga_count": 150,
  "total_chapters": 5000,
  "total_pages": 150000,
  "created_at": "2026-01-14 00:00:00",
  "updated_at": "2026-01-14 00:00:00"
}
```

### 3. 创建新书库
**POST** `/api/libraries`

**请求体**:
```json
{
  "name": "新书库",
  "path": "E:/Manga2",
  "description": "备用漫画库"
}
```

**响应示例**:
```json
{
  "id": 2,
  "name": "新书库",
  "path": "E:/Manga2",
  "description": "备用漫画库",
  "is_active": 1,
  "created_at": "2026-01-14 00:00:00",
  "updated_at": "2026-01-14 00:00:00"
}
```

### 4. 更新书库信息
**PUT** `/api/libraries/:id`

**请求体**:
```json
{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "is_active": true
}
```

### 5. 删除书库
**DELETE** `/api/libraries/:id`

**注意**: 如果书库下还有漫画，将无法删除。

**响应示例**:
```json
{
  "success": true
}
```

或错误响应:
```json
{
  "error": "该书库下还有漫画，请先删除或移动漫画",
  "manga_count": 150
}
```

### 6. 获取书库统计信息
**GET** `/api/libraries/:id/stats`

**响应示例**:
```json
{
  "total_manga": 150,
  "total_chapters": 5000,
  "total_pages": 150000,
  "favorite_count": 25,
  "total_tags": 30
}
```

---

## 元数据管理 API

### 1. 搜索漫画元数据
**GET** `/api/metadata/search?title=xxx`

**查询参数**:
- `title` (string): 漫画标题

**响应示例**:
```json
{
  "query": "进击的巨人 [完结]",
  "keyword": "进击的巨人",
  "results": [
    {
      "source": "local",
      "title": "进击的巨人",
      "alternativeTitles": [],
      "description": "暂无描述",
      "author": "未知",
      "artist": "未知",
      "genres": [],
      "tags": [],
      "status": "unknown",
      "year": null,
      "coverUrl": null,
      "externalId": null,
      "score": 0.8
    }
  ],
  "message": "元数据匹配功能正在开发中，当前返回模拟数据"
}
```

**注意**: 当前版本返回模拟数据，未来版本将集成外部API（MyAnimeList, AniList, Bangumi等）。

### 2. 应用元数据到漫画
**POST** `/api/metadata/apply/:mangaId`

**请求体**:
```json
{
  "metadata": {
    "title": "进击的巨人",
    "author": "谏山创",
    "description": "人类与巨人的战斗...",
    "tags": ["热血", "冒险", "战斗"],
    "year": 2009,
    "status": "completed"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "元数据已应用",
  "metadata": { ... }
}
```

### 3. 获取漫画的元数据
**GET** `/api/metadata/:mangaId`

**响应示例**:
```json
{
  "title": "进击的巨人",
  "author": "谏山创",
  "description": "人类与巨人的战斗...",
  "tags": ["热血", "冒险", "战斗"],
  "year": 2009,
  "status": "completed"
}
```

### 4. 批量匹配元数据
**POST** `/api/metadata/batch-match`

**请求体**:
```json
{
  "mangaIds": [1, 2, 3, 4, 5]
}
```

**响应示例**:
```json
{
  "total": 5,
  "results": [
    {
      "mangaId": 1,
      "title": "进击的巨人",
      "keyword": "进击的巨人",
      "success": true,
      "matched": false,
      "message": "元数据匹配功能开发中"
    }
  ]
}
```

### 5. 删除漫画元数据
**DELETE** `/api/metadata/:mangaId`

**响应示例**:
```json
{
  "success": true
}
```

---

## 搜索 API 更新

### 自动补全（增强版）
**GET** `/api/search/autocomplete?q=xxx&type=all`

**查询参数**:
- `q` (string): 搜索关键词（至少2个字符）
- `type` (string): 搜索类型，可选值: `manga`, `tag`, `all`（默认）

**响应示例**:
```json
{
  "manga": [
    {
      "id": 1,
      "title": "进击的巨人",
      "cover_path": "/path/to/cover.jpg",
      "last_read_at": "2026-01-14 00:00:00",
      "is_favorite": 1,
      "priority": 1
    }
  ],
  "tags": [
    {
      "id": 1,
      "name": "热血",
      "color": "#ff6b6b",
      "manga_count": 15
    }
  ]
}
```

**优先级说明**:
- `priority = 1`: 标题以搜索词开头
- `priority = 2`: 标题包含空格+搜索词
- `priority = 3`: 标题包含搜索词

结果按优先级、收藏状态、最后阅读时间排序。

---

## 扩展性说明

### 元数据API集成建议

未来可以集成以下外部API：

1. **MyAnimeList API**
   - 端点: `https://api.myanimelist.net/v2/manga`
   - 需要: API Key
   - 文档: https://myanimelist.net/apiconfig/references/api/v2

2. **AniList GraphQL API**
   - 端点: `https://graphql.anilist.co`
   - 无需API Key
   - 文档: https://anilist.gitbook.io/anilist-apiv2-docs/

3. **Bangumi API**
   - 端点: `https://api.bgm.tv`
   - 文档: https://bangumi.github.io/api/

### 实现示例

```javascript
// 在 metadata.js 中集成 AniList
async function searchAniList(title) {
  const query = `
    query ($search: String) {
      Media (search: $search, type: MANGA) {
        id
        title { romaji, english, native }
        description
        staff { edges { node { name { full } } } }
        tags { name }
        status
        startDate { year }
        coverImage { large }
      }
    }
  `;
  
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { search: title } })
  });
  
  return await response.json();
}
```


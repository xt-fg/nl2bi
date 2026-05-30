# GitHub 仓库上传指南

## 前置条件

1. 已安装 Git
2. 已注册 GitHub 账号
3. 已配置 Git 用户信息

## 上传步骤

### 1. 创建 GitHub 仓库

1. 登录 GitHub
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `nl2bi`
   - **Description**: `基于 Multi-Agent 架构的 NL2BI（自然语言转BI报表）全栈项目`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Add a README file"（我们已经有了）
4. 点击 "Create repository"

### 2. 关联远程仓库

在本地项目目录执行以下命令：

```bash
# 进入项目目录
cd /home/xf/test/nl2bi

# 关联远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/nl2bi.git

# 验证远程仓库
git remote -v
```

### 3. 推送代码到 GitHub

```bash
# 推送所有代码
git push -u origin master
```

### 4. 验证上传

1. 访问你的 GitHub 仓库页面
2. 确认所有文件已上传
3. 检查 README.md 是否正确显示

## 后续更新

```bash
# 添加修改的文件
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到 GitHub
git push
```

## 仓库结构

上传后的仓库结构：

```
nl2bi/
├── .gitignore              # Git 忽略文件
├── README.md               # 项目说明
├── GITHUB.md               # GitHub 上传指南
├── PROJECT_SUMMARY.md      # 项目总结
├── TODO.md                 # 任务看板
├── docker-compose.yml      # Docker 部署配置
├── start.sh                # 启动脚本
├── test.sh                 # 测试脚本
├── backend/                # 后端服务
│   ├── .gitignore
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── app/
└── frontend/               # 前端应用
    ├── .gitignore
    ├── Dockerfile
    ├── package.json
    └── src/
```

## 注意事项

1. **敏感信息**: `.env` 文件已被 `.gitignore` 忽略，不会上传到 GitHub
2. **依赖目录**: `node_modules/` 和 `.venv/` 已被忽略
3. **构建产物**: `dist/` 和 `build/` 目录已被忽略

## 克隆仓库

其他人可以通过以下命令克隆仓库：

```bash
git clone https://github.com/YOUR_USERNAME/nl2bi.git
cd nl2bi
```

然后按照 README.md 中的说明启动项目。
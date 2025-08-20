#!/bin/bash

# WTF Cosmos JS - 设置脚本

set -e

echo "🛠️ Setting up WTF Cosmos JS development environment..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "📌 Please install Node.js 16 or higher from https://nodejs.org/"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 安装开发依赖
echo "📦 Installing development dependencies..."
npm install --save-dev

# 创建目录
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data
mkdir -p tests/fixtures

# 复制环境变量文件
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file from template..."
    cp .env.example .env
fi

# 检查代码风格
echo "🔍 Running code style check..."
npm run lint

# 运行测试
echo "🧪 Running tests..."
npm test

# 生成文档
echo "📝 Generating documentation..."
if command -v jsdoc &> /dev/null; then
    npm run docs
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Next steps:"
echo "  1. Review and modify .env file if needed"
echo "  2. Run 'npm start' to start the server"
echo "  3. Visit http://localhost:3000 to access the dashboard"
echo "  4. Check out the API at http://localhost:3000/api"
echo ""
echo "📚 Documentation:"
echo "  - README.md for getting started"
echo "  - docs/API.md for API reference"
echo "  - docs/ folder for more detailed documentation"
echo ""
echo "🎉 Happy coding!"
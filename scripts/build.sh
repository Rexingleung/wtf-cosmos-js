#!/bin/bash

# WTF Cosmos JS - 构建脚本

set -e

echo "🔧 Building WTF Cosmos JS..."

# 清理构建目录
if [ -d "dist" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf dist
fi

# 创建构建目录
mkdir -p dist

# 复制源文件
echo "📋 Copying source files..."
cp -r src/* dist/
cp -r public dist/
cp package.json dist/
cp .env.example dist/

# 安装生产依赖
echo "📦 Installing production dependencies..."
cd dist
npm install --production
cd ..

# 运行测试
echo "🧪 Running tests..."
npm test

# 检查代码质量
echo "🔍 Running linter..."
npm run lint

# 生成文档
if command -v jsdoc &> /dev/null; then
    echo "📝 Generating documentation..."
    npm run docs
    if [ -d "docs-generated" ]; then
        cp -r docs-generated dist/
    fi
fi

# 压缩文件
if command -v tar &> /dev/null; then
    echo "📦 Creating distribution archive..."
    tar -czf wtf-cosmos-js-$(date +%Y%m%d-%H%M%S).tar.gz dist/
fi

echo ""
echo "✅ Build completed successfully!"
echo "📋 Build artifacts are in the 'dist' directory"
echo "🚀 You can deploy the contents of 'dist' to your server"
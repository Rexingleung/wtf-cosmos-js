#!/bin/bash

# WTF Cosmos JS - Setup Script
# 项目设置脚本

echo "🚀 设置 WTF Cosmos JS 项目..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version 2>/dev/null || echo "未安装")
if [[ $NODE_VERSION == "未安装" ]]; then
    echo "❌ 错误: 请先安装 Node.js (>= 16.0.0)"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 安装依赖
echo "📦 安装依赖包..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 复制环境配置文件
if [ ! -f .env ]; then
    echo "📄 创建环境配置文件..."
    cp .env.example .env
fi

# 创建必要的目录
echo "📁 创建项目目录..."
mkdir -p logs
mkdir -p data
mkdir -p coverage

# 检查端口是否被占用
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  警告: 端口 $PORT 已被占用"
else
    echo "✅ 端口 $PORT 可用"
fi

echo "🎉 项目设置完成!"
echo ""
echo "💡 下一步:"
echo "   npm start      - 启动生产服务器"
echo "   npm run dev    - 启动开发服务器"
echo "   npm test       - 运行测试"
echo "   npm run lint   - 代码检查"
echo ""
echo "🌐 Web 界面: http://localhost:$PORT"
echo "🔗 API 文档: http://localhost:$PORT/api"

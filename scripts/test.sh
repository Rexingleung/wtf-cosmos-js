#!/bin/bash

# WTF Cosmos JS - 测试脚本

set -e

echo "🧪 Running WTF Cosmos JS test suite..."

# 检查测试环境
export NODE_ENV=test

# 清理之前的测试结果
if [ -d "coverage" ]; then
    rm -rf coverage
fi

# 运行单元测试
echo "🔍 Running unit tests..."
npm run test:unit

# 运行集成测试
echo "🔗 Running integration tests..."
npm run test:integration

# 生成覆盖率报告
echo "📊 Generating coverage report..."
npm run test:coverage

# 检查代码风格
echo "🖋 Checking code style..."
npm run lint

# 检查安全漏洞
if command -v npm-audit &> /dev/null || npm audit --version &> /dev/null; then
    echo "🔒 Running security audit..."
    npm audit --audit-level moderate
fi

echo ""
echo "✅ All tests passed!"
echo "📊 Coverage report is available in the 'coverage' directory"
echo "🔍 Open coverage/index.html in your browser to view detailed coverage"
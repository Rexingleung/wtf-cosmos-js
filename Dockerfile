# WTF Cosmos JS - Docker 构建文件

# 使用官方 Node.js 运行时镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用源代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S wtfcosmos -u 1001

# 创建必要的目录
RUN mkdir -p logs data && \
    chown -R wtfcosmos:nodejs /app

# 切换到非 root 用户
USER wtfcosmos

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/blockchain/stats', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# 启动命令
CMD ["npm", "start"]

# 添加标签
LABEL name="wtf-cosmos-js" \
      version="1.0.0" \
      description="A blockchain implementation built with JavaScript for educational purposes" \
      maintainer="WTF Academy" \
      url="https://github.com/Rexingleung/wtf-cosmos-js"
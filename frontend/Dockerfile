FROM docker.m.daocloud.io/library/node:20-alpine AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY

WORKDIR /app
COPY . .

# 设置构建时的环境变量（使用默认值）
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# 使用国内镜像加速
RUN npm config set registry https://registry.npmmirror.com
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm ci --prefer-offline --no-audit --fund=false
RUN npm run build

FROM docker.m.daocloud.io/library/node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules


# 注意：API 基础 URL 通过 Nginx 设置
# 启动命令
CMD ["npm", "start"]

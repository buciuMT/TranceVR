# ---- Build Stage ----
FROM oven/bun:latest AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy sources and build
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/
RUN bun run build

# ---- Serve Stage ----
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy favicon / icons to root
COPY public/favicon.svg /usr/share/nginx/html/favicon.svg
COPY public/icons.svg /usr/share/nginx/html/icons.svg

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

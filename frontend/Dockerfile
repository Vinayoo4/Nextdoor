FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Copy shared types
COPY shared/ ./shared/

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend
RUN npm run build -w frontend

# Serve stage
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

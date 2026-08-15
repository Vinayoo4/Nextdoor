FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configuration
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Copy shared types
COPY shared/ ./shared/

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./backend/

# Build backend
RUN npm run build -w backend

# Production image
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built code from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY shared/ ./shared/

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "backend/dist/index.js"]

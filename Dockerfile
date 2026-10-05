# Dockerfile for Connect Pro (Remote Desktop MVP)
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy application files
COPY . .

# Build Vite frontend
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "server.ts"]

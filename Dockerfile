# Dockerfile for Connect Pro (Remote Desktop MVP)
FROM node:22-alpine

WORKDIR /app

# Copy package and npm config files
COPY package*.json .npmrc* ./

# Install dependencies safely with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Build Vite frontend
RUN npm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["npx", "tsx", "server.ts"]

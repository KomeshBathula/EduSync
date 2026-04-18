FROM node:22-slim

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "server.js"]

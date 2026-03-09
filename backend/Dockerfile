# Backend Dockerfile
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY . .

# Non-root user for security
RUN addgroup -S parksmart && adduser -S parksmart -G parksmart
USER parksmart

EXPOSE 4000

CMD ["node", "server.js"]

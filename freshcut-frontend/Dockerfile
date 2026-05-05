FROM node:22-alpine AS builder
WORKDIR /app

# Copy only package.json to avoid Windows lockfile mismatch
COPY package.json ./

# Install dependencies fresh for Linux Alpine
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

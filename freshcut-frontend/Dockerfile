FROM node:22-alpine AS builder
WORKDIR /app

# Copy only package.json to avoid Windows lockfile mismatch
COPY package.json ./

# Install dependencies fresh for Linux Alpine
RUN npm install

# Copy source and build
COPY . .

# Inject Railway environment variables into the Vite build
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY:-AIzaSyDjREBSi-fW2Q2buCs2IXCZ2zoCwmB6qVQ}

RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

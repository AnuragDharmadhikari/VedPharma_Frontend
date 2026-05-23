# ── Stage 1: Build ────────────────────────────────────────────
# Use Node.js to install dependencies and build the React app
# This stage is heavy but gets discarded — never reaches production
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files first — Docker caches this layer
# If package.json hasn't changed, npm install is not re-run
# This is the most important Docker optimization for Node projects
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source and build
# Vite produces optimized static files in /app/dist
COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────
# Use Nginx to serve the static files
# nginx:alpine is only ~25MB — extremely lean
FROM nginx:alpine AS runtime

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Nginx starts automatically — no custom entrypoint needed
CMD ["nginx", "-g", "daemon off;"]
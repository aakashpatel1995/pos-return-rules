FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy rest of app (excluding extensions - not needed on server)
COPY app ./app
COPY vite.config.js ./
COPY shopify.app.toml ./

# Generate Prisma client
RUN npx prisma generate

# Build Remix app
RUN npm run build

# Expose port
EXPOSE 8080

# Start: run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && HOST=0.0.0.0 PORT=8080 npx remix-serve ./build/server/index.js"]

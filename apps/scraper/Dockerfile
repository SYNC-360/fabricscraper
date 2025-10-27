FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo
COPY . .

# Install dependencies
RUN pnpm install

# Build
RUN pnpm -w build

# Run actor
CMD ["node", "dist/apps/scraper/src/actor.js"]

FROM oven/bun:1.4.2-alpine

WORKDIR /app

# Copy Bun lockfile and package manifest first for dependency caching
COPY package.json bun.lock ./

RUN bun install 

COPY . .

EXPOSE 5173

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
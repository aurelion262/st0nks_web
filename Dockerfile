FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build the production bundle (tsc + vite)
RUN npm run build

# ─────────────────────────────────────────────
# Serve the static output with a lightweight server
FROM node:20-alpine AS production

RUN npm install -g serve

WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]

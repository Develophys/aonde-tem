# --- build stage ---
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aonde-tem/api exec prisma generate
RUN pnpm --filter @aonde-tem/api... build
RUN pnpm --filter @aonde-tem/api deploy --prod /app

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "dist/main.js"]

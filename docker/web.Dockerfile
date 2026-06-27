# --- build stage ---
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL=/
ARG VITE_MAP_KEY=
ENV VITE_API_URL=$VITE_API_URL VITE_MAP_KEY=$VITE_MAP_KEY
RUN pnpm --filter @aonde-tem/web... build

# --- runtime stage (static) ---
FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

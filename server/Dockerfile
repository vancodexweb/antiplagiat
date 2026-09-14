# syntax=docker/dockerfile:1

# Единая кодовая база для api и worker (см. раздел 0 ТЗ: worker — тот же
# NestJS-проект с отдельным main-worker.ts). Собирается один раз, дальше
# расходится на два целевых образа (api/worker) с разным CMD.

FROM node:22-bookworm-slim AS deps
WORKDIR /app

# openssl нужен, чтобы Prisma на этапе generate/migrate корректно определил
# вариант нативного движка (debian-openssl-3.0.x) — без него он гадает
# наугад и не находит уже скачанный бинарник в кэше.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json .npmrc ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
# generate не подключается к БД, но prisma.config.ts требует, чтобы
# DATABASE_URL был разрешим — на этапе сборки образа реальная БД ещё
# недоступна, поэтому подставляем заглушку (реальный URL приходит в
# контейнер во время выполнения через docker-compose).
ARG DATABASE_URL=postgresql://user:password@localhost:5432/db
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
# "Прогреваем" кэш schema-engine (используется командой `migrate deploy` в
# entrypoint'е api) прямо на этапе сборки, пока есть доступ в сеть — иначе
# контейнер попытается скачать его при каждом запуске. Реальное подключение
# к БД здесь недоступно и ожидаемо падает уже после загрузки движка.
RUN npx prisma migrate deploy || true

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts
COPY package.json ./
COPY docker/entrypoint-api.sh ./entrypoint-api.sh
RUN chmod +x ./entrypoint-api.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint-api.sh"]
CMD ["node", "dist/main.js"]

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma
COPY package.json ./

CMD ["node", "dist/main-worker.js"]

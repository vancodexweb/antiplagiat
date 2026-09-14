#!/bin/sh
set -e

echo "[api] применяю миграции Prisma (prisma migrate deploy)..."
npx prisma migrate deploy
echo "[api] миграции применены"

exec "$@"

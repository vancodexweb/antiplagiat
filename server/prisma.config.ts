import { defineConfig, env } from 'prisma/config';

// Prisma 7: URL подключения для Migrate/Studio задаётся здесь, а не в
// datasource-блоке schema.prisma (см. prisma/schema.prisma).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});

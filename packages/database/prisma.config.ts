// packages/database/prisma.config.ts
import { defineConfig, env } from '@prisma/config';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of your project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    /** Run from `packages/database`: `npx prisma db seed` */
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
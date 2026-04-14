import { defineConfig } from 'prisma/config';
import { connectionString } from './src/index';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: connectionString,
  },
});

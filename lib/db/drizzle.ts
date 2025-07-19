import { env } from '@/lib/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not set');
}

export const client = postgres(env.POSTGRES_URL);
export const db = drizzle(client, { schema });

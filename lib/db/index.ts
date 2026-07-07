import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

export const isDatabaseConfigured = () => Boolean(connectionString);

const pool = connectionString ? new Pool({ connectionString }) : undefined;
export const db = connectionString
  ? drizzle(pool as Pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

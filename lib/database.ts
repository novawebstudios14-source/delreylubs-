import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

const globalForPool = globalThis as typeof globalThis & { workshopPool?: Pool };

function pool() {
  if (!process.env.APPWRITE_DATABASE_URL) throw new Error('APPWRITE_DATABASE_URL ausente.');
  return globalForPool.workshopPool ??= new Pool({
    connectionString: process.env.APPWRITE_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query<T>(sql, params)).rows;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

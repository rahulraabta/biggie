import pg, { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  var pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!globalThis.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }
    globalThis.pgPool = new pg.Pool({
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    globalThis.pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });
  }
  return globalThis.pgPool;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const p = getPool();
  if (params) {
    return p.query<R>(text, params);
  }
  return p.query<R>(text);
}

export async function closePool(): Promise<void> {
  if (globalThis.pgPool) {
    await globalThis.pgPool.end();
    globalThis.pgPool = undefined;
    console.log('[PostgreSQL Pool] All connections closed safely.');
  }
}

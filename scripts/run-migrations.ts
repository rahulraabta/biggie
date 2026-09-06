/* Applies every .sql file in src/db/migrations/ in filename order to the
 * direct (unpooled) Neon connection, then verifies pgvector state.
 * Usage: npx tsx scripts/run-migrations.ts
 * DDL must NOT run over the pooled (-pooler) endpoint: PgBouncer transaction
 * mode breaks session-level operations, so we use DATABASE_URL_UNPOOLED.
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const url = (process.env.DATABASE_URL_UNPOOLED || '').trim();
if (!url) throw new Error('DATABASE_URL_UNPOOLED not set');
if (url.includes('-pooler')) throw new Error('Refusing to migrate over a pooled connection string');

const client = new pg.Client({ connectionString: url });

async function main() {
  const dir = path.resolve(process.cwd(), 'src/db/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('no migration files found in src/db/migrations');
    return;
  }

  await client.connect();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`applying ${file}... `);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('ok');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`${file} failed: ${(err as Error).message}`);
    }
  }

  console.log('\n--- verification ---');
  const ext = await client.query<{ extversion: string }>(
    `SELECT extversion FROM pg_extension WHERE extname = 'vector'`
  );
  if (ext.rows.length === 0) throw new Error('vector extension NOT active');
  console.log(`extension: vector ${ext.rows[0].extversion} ACTIVE`);

  const col = await client.query<{ udt_name: string; character_maximum_length: number }>(
    `SELECT udt_name, character_maximum_length FROM information_schema.columns
     WHERE table_name = 'opportunities' AND column_name = 'embedding'`
  );
  if (col.rows.length === 0) throw new Error('opportunities.embedding column missing');
  console.log(`column: opportunities.embedding -> vector(${col.rows[0].character_maximum_length})`);

  const idx = await client.query<{ indexdef: string }>(
    `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_opportunities_embedding'`
  );
  if (idx.rows.length === 0) throw new Error('HNSW index missing');
  console.log(`index: ${idx.rows[0].indexdef}`);

  await client.end();
  console.log('\nAll checks passed.');
}

main().catch(async (err) => {
  console.error('MIGRATIONS FAILED:', (err as Error).message);
  try { await client.end(); } catch {}
  process.exit(1);
});

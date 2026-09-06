/* One-off: apply src/db/schema.sql (idempotent DDL) to the direct Neon connection, then verify pgvector. Run with tsx. */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const url = (process.env.DATABASE_URL_UNPOOLED || '').trim();
if (!url) throw new Error('DATABASE_URL_UNPOOLED not set');

const client = new pg.Client({ connectionString: url });

async function main() {
  const sqlPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const ddl = fs.readFileSync(sqlPath, 'utf8');
  console.log(`applying ${path.relative(process.cwd(), sqlPath)} (${ddl.length} bytes) on direct connection...`);
  await client.connect();
  await client.query(ddl);
  console.log('schema applied.');

  console.log('\n--- verification ---');
  const ext = await client.query<{ extname: string; extversion: string }>(
    `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`
  );
  if (ext.rows.length === 0) throw new Error('vector extension NOT active');
  console.log(`extension: vector ${ext.rows[0].extversion} ACTIVE`);

  const col = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
    `SELECT column_name, data_type, udt_name FROM information_schema.columns
     WHERE table_name = 'opportunities' AND column_name = 'embedding'`
  );
  if (col.rows.length === 0) throw new Error('opportunities.embedding column missing');
  console.log(`column: opportunities.embedding -> ${col.rows[0].udt_name}`);

  const idx = await client.query<{ indexname: string; indexdef: string }>(
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE indexname = 'idx_opportunities_embedding'`
  );
  if (idx.rows.length === 0) throw new Error('HNSW index missing');
  console.log(`index: ${idx.rows[0].indexdef}`);

  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log(`tables: ${tables.rows.map((r) => r.table_name).join(', ')}`);

  await client.end();
  console.log('\nAll checks passed.');
}

main().catch(async (err) => {
  console.error('MIGRATION FAILED:', err.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

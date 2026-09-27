import dotenv from 'dotenv';
import path from 'node:path';

// Load real credentials before applying test defaults, so `??=` never
// clobbers values (e.g. DATABASE_URL) already provided by .env.local/.env.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

Object.assign(process.env, { NODE_ENV: 'test' });
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/biggie_test';
process.env.PIPELINE_POLL_MS ??= '100';
process.env.PIPELINE_TIMEOUT_MS ??= '5000';

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
exports.closePool = closePool;
const pg_1 = __importDefault(require("pg"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pool = null;
function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not defined.');
        }
        pool = new pg_1.default.Pool({
            connectionString,
            max: parseInt(process.env.PG_POOL_MAX || '10', 10),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err) => {
            console.error('[PostgreSQL Pool Error]', err);
        });
    }
    return pool;
}
async function query(text, params) {
    const p = getPool();
    if (params) {
        return p.query(text, params);
    }
    return p.query(text);
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[PostgreSQL Pool] All connections closed safely.');
    }
}

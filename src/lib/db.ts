/**
 * Postgres connection pool untuk Agronow ESS.
 *
 * Sumber data: Supabase Postgres (project `agronow`) — sama dengan agronow-insight,
 * via session pooler (IPv4). Koneksi dari `SUPABASE_DB_URL` di `.env.local`.
 * Pool `pg` disimpan singleton lintas HMR.
 *
 * Catatan dialek: query memakai placeholder gaya `?` (warisan MySQL); `query()`
 * otomatis mengubahnya jadi `$1, $2, …` untuk Postgres.
 */
import pg, { Pool } from "pg";

// Tanggal sebagai STRING (bukan Date); COUNT/bigint sebagai number.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1114, (v) => v); // timestamp
pg.types.setTypeParser(1184, (v) => v); // timestamptz
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // int8/bigint

declare global {
  // eslint-disable-next-line no-var
  var __agronowEssPg: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL belum di-set di .env.local");
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_LIMIT ?? 10),
  });
}

export function getPool(): Pool {
  if (!global.__agronowEssPg) global.__agronowEssPg = createPool();
  return global.__agronowEssPg;
}

/** Ubah placeholder `?` → `$1, $2, …`. */
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Jalankan SELECT, kembalikan array baris bertipe T. */
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(toPg(sql), params);
  return res.rows as T[];
}

/** Ambil satu baris (atau null). */
export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

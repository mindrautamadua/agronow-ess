import { query } from "@/lib/db";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kamus istilah perkebunan (untuk halaman Bantuan). */
export async function GET() {
  try {
    const rows = await query<{ kamus_name: string; kamus_desc: string }>(
      `SELECT kamus_name, kamus_desc FROM _kamus ORDER BY kamus_name ASC LIMIT 300`,
    );
    return Response.json({ terms: rows.map((r) => ({ name: clean(r.kamus_name), desc: clean(r.kamus_desc) })) });
  } catch (e) {
    console.error("/api/kamus", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

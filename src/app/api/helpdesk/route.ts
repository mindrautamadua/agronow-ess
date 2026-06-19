import { query, queryOne } from "@/lib/db";
import { currentMemberId } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kategori bantuan Helpdesk. Key disimpan di `_helpdesk.category`, label di
 * `_helpdesk.category_name`. Dipakai juga oleh form untuk mengisi dropdown.
 */
export const HELPDESK_CATEGORIES: { key: string; label: string }[] = [
  { key: "belajar_di_kelas", label: "Belajar di Kelas" },
  { key: "progres_jpl", label: "Progres & JPL" },
  { key: "wishlist", label: "Wishlist & Katalog Pelatihan" },
  { key: "idp", label: "IDP (Individual Development Program)" },
  { key: "agro_wallet", label: "Agro Wallet / Saldo Pelatihan" },
  { key: "akun_login", label: "Akun & Login" },
  { key: "aplikasi_teknis", label: "Kendala Teknis Aplikasi" },
  { key: "lainnya", label: "Lainnya" },
];
const LABEL = new Map(HELPDESK_CATEGORIES.map((c) => [c.key, c.label]));

/** Riwayat tiket Helpdesk milik member yang sedang login. */
export async function GET() {
  try {
    const memberId = await currentMemberId();
    const rows = await query<{
      helpdesk_id: number; category: string | null; category_name: string | null;
      description: string | null; berkas: string | null; status: number | null;
      closed: number | null; created_at: string | null;
    }>(
      `SELECT helpdesk_id, category, category_name, description, berkas, status, closed, created_at
         FROM _helpdesk WHERE member_id = ? ORDER BY helpdesk_id DESC LIMIT 20`,
      [String(memberId)],
    );
    const items = rows.map((r) => ({
      id: r.helpdesk_id,
      category: clean(r.category_name),
      description: clean(r.description),
      berkas: clean(r.berkas) || null,
      closed: Number(r.closed) === 1,
      createdAt: r.created_at,
    }));
    return Response.json({ items });
  } catch (e) {
    console.error("GET /api/helpdesk", e);
    return Response.json({ error: "Gagal memuat riwayat" }, { status: 500 });
  }
}

/**
 * Kirim permasalahan baru ke Helpdesk. Tabel `_helpdesk` tidak memakai sequence
 * untuk `helpdesk_id`, jadi id di-generate `MAX(helpdesk_id)+1` di dalam INSERT.
 * member_name / member_nip / group_id diambil dari `_member`. Status awal: baru
 * (status=1, belum dibaca, belum ditutup).
 */
export async function POST(req: Request) {
  const memberId = await currentMemberId();

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const str = (v: unknown) => String(v ?? "").trim();
  const category = str(b.category);
  const description = str(b.description);
  const berkas = str(b.berkas) || null;

  if (!LABEL.has(category)) {
    return Response.json({ error: "Kategori bantuan tidak valid" }, { status: 400 });
  }
  if (!description) {
    return Response.json({ error: "Permasalahan wajib diisi" }, { status: 400 });
  }

  try {
    const m = await queryOne<{ member_name: string | null; member_nip: string | null; group_id: number | null }>(
      `SELECT member_name, member_nip, group_id FROM _member WHERE member_id = ?`,
      [memberId],
    );

    const rows = await query<{ helpdesk_id: number }>(
      `INSERT INTO _helpdesk
         (helpdesk_id, member_id, member_name, member_nip, group_id,
          category, category_name, description, berkas,
          status, is_read, closed, created_at, updated_at)
       VALUES
         ((SELECT COALESCE(MAX(helpdesk_id), 0) + 1 FROM _helpdesk), ?, ?, ?, ?,
          ?, ?, ?, ?, 1, 0, 0, NOW()::timestamp, NOW()::timestamp)
       RETURNING helpdesk_id`,
      [
        String(memberId), m?.member_name ?? null, m?.member_nip ?? null, m?.group_id ?? null,
        category, LABEL.get(category), description, berkas,
      ],
    );
    return Response.json({ id: rows[0]?.helpdesk_id ?? null });
  } catch (e) {
    console.error("POST /api/helpdesk", e);
    return Response.json({ error: "Gagal mengirim ke Helpdesk" }, { status: 500 });
  }
}

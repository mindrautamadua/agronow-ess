import { getPool, queryOne } from "@/lib/db";
import { currentMemberId, getMemberLevel, canCreateCoaching } from "@/lib/member";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SESI = 4;
const MAX_SESI = 6;
const JPL_PER_SESI = 2; // 1 sesi coaching = 2 JPL.

// Mode coaching: "development_dialogue" (atasan–bawahan, wajib pilih bawahan)
// atau "publik" (tanpa coachee).
const MODES = ["development_dialogue", "publik"] as const;
type Mode = (typeof MODES)[number];

interface SesiInput { tanggal: string; jam: string }

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
const toPg = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

/**
 * Buat 1 Paket Coaching (jadwal pertemuan) berisi 4–6 sesi. Pembimbing = member
 * login (wajib BOD-1/BOD-2). Paket diberi KODE unik (CO-<tahun>-<id 4 digit>),
 * sesi diberi URUTAN otomatis 1..n berdasarkan tanggal-jam menaik.
 * `_come_paket_sesi(_detail)` tak punya sequence id → id di-generate MAX+1 dalam
 * transaksi agar konsisten.
 */
export async function POST(req: Request) {
  const pembimbing = await currentMemberId();
  const level = await getMemberLevel(pembimbing);
  if (!canCreateCoaching(level)) {
    return Response.json({ error: "Hanya BOD-1 & BOD-2 yang dapat membuat paket coaching." }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const mode = String(b.mode ?? "") as Mode;
  if (!MODES.includes(mode)) {
    return Response.json({ error: "Mode coaching tidak valid." }, { status: 400 });
  }

  // Tentukan coachee: wajib bawahan untuk Development Dialogue; NULL untuk Publik.
  let idPeserta: number | null = null;
  if (mode === "development_dialogue") {
    idPeserta = Number(b.idPeserta);
    if (!Number.isInteger(idPeserta) || idPeserta <= 0) {
      return Response.json({ error: "Pilih bawahan (coachee) untuk Development Dialogue." }, { status: 400 });
    }
    if (idPeserta === pembimbing) {
      return Response.json({ error: "Coachee tidak boleh diri sendiri." }, { status: 400 });
    }
    // Pastikan benar-benar bawahan pembimbing & aktif.
    const ok = await queryOne<{ member_id: number }>(
      `SELECT m.member_id FROM _come_member_profil p
         JOIN _member m ON m.member_id = p.member_id
        WHERE p.member_id = ? AND p.atasan_id = ? AND m.member_status = 'active' LIMIT 1`,
      [idPeserta, pembimbing],
    );
    if (!ok) return Response.json({ error: "Coachee bukan bawahan Anda / tidak aktif." }, { status: 400 });
  }

  const raw = Array.isArray(b.sessions) ? (b.sessions as SesiInput[]) : [];
  const sessions = raw
    .map((s) => ({ tanggal: String(s?.tanggal ?? "").trim(), jam: String(s?.jam ?? "").trim() }))
    .filter((s) => s.tanggal && s.jam);

  if (sessions.length < MIN_SESI || sessions.length > MAX_SESI) {
    return Response.json({ error: `Jumlah sesi harus ${MIN_SESI}–${MAX_SESI}.` }, { status: 400 });
  }
  for (const s of sessions) {
    if (!isDate(s.tanggal) || !isTime(s.jam)) {
      return Response.json({ error: "Format tanggal/jam sesi tidak valid." }, { status: 400 });
    }
  }
  // Urutkan menaik & cegah duplikat waktu.
  sessions.sort((a, b2) => `${a.tanggal} ${a.jam}`.localeCompare(`${b2.tanggal} ${b2.jam}`));
  const keys = new Set(sessions.map((s) => `${s.tanggal} ${s.jam}`));
  if (keys.size !== sessions.length) {
    return Response.json({ error: "Ada sesi dengan tanggal & jam yang sama." }, { status: 400 });
  }

  const tahun = Number(b.tahun) || Number(sessions[0].tanggal.slice(0, 4));
  const jpl = sessions.length * JPL_PER_SESI;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const head = await client.query(
      toPg(
        `INSERT INTO _come_paket_sesi
           (id, tipe, mode, tahun, no_paket, id_pembimbing, id_peserta, jpl, status_approval, status)
         VALUES
           ((SELECT COALESCE(MAX(id), 0) + 1 FROM _come_paket_sesi),
            'coach', ?, ?,
            (SELECT COALESCE(MAX(no_paket), 0) + 1 FROM _come_paket_sesi WHERE tipe='coach' AND tahun=? AND id_pembimbing=?),
            ?, ?, ?, 'pending', '1')
         RETURNING id, no_paket`,
      ),
      [mode, tahun, tahun, pembimbing, pembimbing, idPeserta, jpl],
    );
    const paketId: number = head.rows[0].id;
    const noPaket: number = head.rows[0].no_paket;
    const kode = `CO-${tahun}-${String(paketId).padStart(4, "0")}`;

    await client.query(toPg("UPDATE _come_paket_sesi SET kode = ? WHERE id = ?"), [kode, paketId]);

    let urutan = 0;
    for (const s of sessions) {
      urutan += 1;
      await client.query(
        toPg(
          `INSERT INTO _come_paket_sesi_detail (id, id_paket_sesi, tanggal, urutan)
           VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM _come_paket_sesi_detail), ?, ?::timestamp, ?)`,
        ),
        [paketId, `${s.tanggal} ${s.jam}:00`, urutan],
      );
    }

    await client.query("COMMIT");
    return Response.json({ ok: true, id: paketId, kode, noPaket, sessions: sessions.length });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("/api/coaching/paket", e);
    return Response.json({ error: "Gagal menyimpan paket coaching" }, { status: 500 });
  } finally {
    client.release();
  }
}

import { getPool, query } from "@/lib/db";
import { currentMemberId, currentNikSap, getMemberByNikSap, getMemberLevel, canCreateCoaching } from "@/lib/member";
import { getBawahanKarpim } from "@/lib/aghris";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SESI = 4;
const MAX_SESI = 6;
const JPL_PER_SESI = 2; // 1 sesi = 2 JPL (sama untuk coach & mentor).

// Jenis bimbingan: coaching atau mentoring (kolom `tipe`). Kode paket: CO/ME.
const TIPES = ["coach", "mentor"] as const;
type Tipe = (typeof TIPES)[number];
const KODE_PREFIX: Record<Tipe, string> = { coach: "CO", mentor: "ME" };

// Mode bimbingan: "development_dialogue" (atasan–bawahan, wajib pilih bawahan)
// atau "publik" (tanpa coachee/mentee).
const MODES = ["development_dialogue", "publik"] as const;
type Mode = (typeof MODES)[number];

interface SesiInput { tanggal: string; jam: string }

/**
 * Daftar Paket Coaching/Mentoring yang dibuat oleh pembimbing yang sedang login
 * (`id_pembimbing = member login`), terbaru dulu. Filter `?tipe=coach|mentor`.
 * Tiap paket menyertakan nama peserta (coachee/mentee) & daftar sesinya
 * (tanggal + urutan) agar bisa langsung ditampilkan & diklik untuk lihat detail.
 */
export async function GET(req: Request) {
  const pembimbing = await currentMemberId();

  const url = new URL(req.url);
  const tipeParam = url.searchParams.get("tipe");
  const tipe = tipeParam && TIPES.includes(tipeParam as Tipe) ? (tipeParam as Tipe) : null;

  interface PaketRow {
    id: number; kode: string | null; tipe: string; mode: string | null;
    tahun: number; no_paket: number; jpl: number; status_approval: string | null;
    id_peserta: number | null; peserta_nama: string | null;
  }
  const pakets = await query<PaketRow>(
    `SELECT p.id, p.kode, p.tipe, p.mode, p.tahun, p.no_paket, p.jpl,
            p.status_approval, p.id_peserta, m.member_name AS peserta_nama
       FROM _come_paket_sesi p
       LEFT JOIN _member m ON m.member_id = p.id_peserta
      WHERE p.id_pembimbing = ? ${tipe ? "AND p.tipe = ?" : ""}
      ORDER BY p.tahun DESC, p.id DESC`,
    tipe ? [pembimbing, tipe] : [pembimbing],
  );

  if (pakets.length === 0) return Response.json({ pakets: [] });

  interface SesiRow { id_paket_sesi: number; urutan: number; tanggal: string }
  const ids = pakets.map((p) => p.id);
  const ph = ids.map(() => "?").join(", ");
  const sesi = await query<SesiRow>(
    `SELECT id_paket_sesi, urutan, tanggal
       FROM _come_paket_sesi_detail
      WHERE id_paket_sesi IN (${ph})
      ORDER BY urutan ASC`,
    ids,
  );
  const byPaket = new Map<number, { urutan: number; tanggal: string }[]>();
  for (const s of sesi) {
    const arr = byPaket.get(s.id_paket_sesi) ?? [];
    arr.push({ urutan: s.urutan, tanggal: s.tanggal });
    byPaket.set(s.id_paket_sesi, arr);
  }

  return Response.json({
    pakets: pakets.map((p) => ({
      id: p.id,
      kode: p.kode ?? `${KODE_PREFIX[p.tipe as Tipe] ?? "?"}-${p.tahun}-${String(p.id).padStart(4, "0")}`,
      tipe: p.tipe,
      mode: p.mode,
      tahun: p.tahun,
      noPaket: p.no_paket,
      jpl: p.jpl,
      statusApproval: p.status_approval,
      peserta: p.id_peserta ? { id: p.id_peserta, nama: p.peserta_nama } : null,
      sessions: byPaket.get(p.id) ?? [],
    })),
  });
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
const toPg = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

/**
 * Buat 1 Paket Coaching (jadwal pertemuan) berisi 4–6 sesi. Pembimbing = member
 * login (wajib BOD-1/BOD-2). Paket diberi KODE unik (CO-<tahun>-<id 4 digit>),
 * sesi diberi URUTAN otomatis 1..n berdasarkan tanggal-jam menaik. Paket langsung
 * `diterima` (auto-publish, tanpa approval).
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

  const tipe = (String(b.tipe ?? "coach")) as Tipe;
  if (!TIPES.includes(tipe)) {
    return Response.json({ error: "Jenis bimbingan tidak valid." }, { status: 400 });
  }

  const mode = String(b.mode ?? "") as Mode;
  if (!MODES.includes(mode)) {
    return Response.json({ error: "Mode bimbingan tidak valid." }, { status: 400 });
  }

  // Tentukan coachee: wajib bawahan (dari AGHRIS) untuk Development Dialogue; NULL untuk Publik.
  let idPeserta: number | null = null;
  if (mode === "development_dialogue") {
    const nikSap = String(b.nikSap ?? "").trim();
    if (!nikSap) {
      return Response.json({ error: "Pilih bawahan (coachee) untuk Development Dialogue." }, { status: 400 });
    }
    // Validasi: nikSap harus benar-benar bawahan si pembimbing (cek ulang ke AGHRIS).
    const nikAtasan = await currentNikSap();
    let bawahan;
    try {
      bawahan = nikAtasan ? await getBawahanKarpim(nikAtasan) : [];
    } catch {
      return Response.json({ error: "Gagal memvalidasi bawahan ke AGHRIS." }, { status: 502 });
    }
    if (!bawahan.some((x) => x.nikSap === nikSap)) {
      return Response.json({ error: "Coachee bukan bawahan Anda." }, { status: 400 });
    }
    // Petakan NIK SAP bawahan → member app.
    const member = await getMemberByNikSap(nikSap);
    if (!member) {
      return Response.json({ error: "Bawahan belum terdaftar sebagai member Agronow." }, { status: 400 });
    }
    idPeserta = member.member_id;
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
            ?, ?, ?,
            (SELECT COALESCE(MAX(no_paket), 0) + 1 FROM _come_paket_sesi WHERE tipe=? AND tahun=? AND id_pembimbing=?),
            ?, ?, ?, 'diterima', '1')
         RETURNING id, no_paket`,
      ),
      [tipe, mode, tahun, tipe, tahun, pembimbing, pembimbing, idPeserta, jpl],
    );
    const paketId: number = head.rows[0].id;
    const noPaket: number = head.rows[0].no_paket;
    const kode = `${KODE_PREFIX[tipe]}-${tahun}-${String(paketId).padStart(4, "0")}`;

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

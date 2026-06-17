/**
 * AI Career Coach — percakapan berbasis OpenAI (gpt-4o-mini) yang *grounded* ke
 * data pembelajaran karyawan lewat function calling. Tool memanggil fungsi read
 * yang sudah ada (profil, progres 70-20-10, skill gap, riwayat, IDP, katalog),
 * jadi jawaban coach selalu berdasar data nyata — bukan mengarang.
 */
import OpenAI from "openai";
import { query } from "./db";
import { clean } from "./text";
import { currentMemberId, getMember } from "./member";
import { getLearningSummary, getMemberClasses, BUCKET_LABEL } from "./learning";
import { getSkillGap } from "./skillgap";

export const COACH_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `Kamu adalah "Coach Agro" — career & learning coach pribadi di aplikasi Agronow (platform Learning & Development PT Perkebunan Nusantara). Kamu mendampingi karyawan mengembangkan kompetensi lewat kerangka 70-20-10 (70% experiential, 20% social, 10% formal).

Definisi penting (JANGAN tertukar):
- JPL (Jam Pelajaran) = satuan DURASI dalam jam, BUKAN jumlah kegiatan. Satu kelas bisa bernilai mis. 22 JPL.
- Sesi / Kelas = JUMLAH kegiatan pelatihan yang diikuti (hitungan/count). "6 kelas" TIDAK sama dengan "6 JPL".
- Total JPL yang dihitung ke target itu DI-CAP per kategori metode belajar (maksimal sebesar target kategori) dan HANYA menghitung pelatihan yang terverifikasi. Akibatnya, total JPL tercatat bisa lebih kecil daripada penjumlahan JPL mentah seluruh kelas. Kalau angka terlihat tidak cocok, jelaskan itu karena cap & status verifikasi — jangan memaksakan agar penjumlahan tampak pas, dan jangan menyamakan jumlah kelas dengan jumlah JPL.
- Saat user menyebut sebuah angka (mis. "6 JPL"), pastikan dulu apakah yang dimaksud total JPL (jam) atau jumlah sesi/kelas (kegiatan). Bila ambigu, perjelas sebelum merinci. "Apa saja 6 JPL" biasanya keliru — 6 JPL adalah 6 jam, bukan 6 item; yang bisa dirinci adalah daftar KELAS, bukan "daftar JPL".

Prinsip:
- Selalu jawab dalam Bahasa Indonesia yang hangat, suportif, dan ringkas — seperti mentor yang peduli, bukan robot.
- Dasarkan jawaban pada DATA NYATA karyawan. Panggil tool yang relevan sebelum memberi angka, rekomendasi, atau klaim tentang progres mereka. Jangan mengarang data.
- Saat merekomendasikan, kaitkan dengan gap/target mereka dan sebutkan pelatihan konkret bila ada (gunakan tool skill gap / cari pelatihan).
- Boleh bantu menyusun draf IDP, rencana belajar, atau menjelaskan istilah.
- Jika data tidak tersedia atau tool gagal, katakan terus terang dan beri saran umum yang tetap berguna.
- Format ringkas: gunakan poin-poin bila membantu, hindari paragraf panjang.`;

// ── Definisi tool (OpenAI function calling) ──────────────────────────────────
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "get_profil", description: "Ambil profil karyawan: nama, jabatan, kelompok jabatan, unit kerja, poin, saldo Agro Wallet.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_progres_belajar", description: "Ringkasan progres pembelajaran 70-20-10 tahun ini: JPL per bucket (formal/sosial/experiential), total JPL vs target, jumlah kelas & sertifikat.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_skill_gap", description: "Peta gap kompetensi per metode belajar (Coaching, Mentoring, Workshop, dst.): capaian vs target JPL, gap terbesar, dan rekomendasi pelatihan nyata dari katalog untuk menutup gap.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_riwayat_pelatihan", description: "Daftar pelatihan/kelas yang pernah diikuti karyawan (terbaru dulu), beserta status verifikasi & JPL.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_idp", description: "Daftar Individual Development Program (IDP) karyawan: area pengembangan, aspirasi, rencana, status.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "cari_pelatihan", description: "Cari pelatihan di katalog berdasarkan kata kunci (judul/topik).", parameters: { type: "object", properties: { kata_kunci: { type: "string", description: "Kata kunci topik, mis. 'kepemimpinan', 'SAP', 'keuangan'." } }, required: ["kata_kunci"] } } },
];

// ── Handler tool — memanggil data layer yang sudah ada ───────────────────────
async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const memberId = currentMemberId();
  switch (name) {
    case "get_profil": {
      const m = await getMember(memberId);
      if (!m) return { error: "Profil tidak ditemukan." };
      return {
        nama: m.member_name, jabatan: m.member_jabatan, kelompok_jabatan: m.member_kel_jabatan,
        unit_kerja: m.member_unit_kerja, poin: m.member_poin ?? 0, saldo_wallet: m.member_saldo ?? 0,
      };
    }
    case "get_progres_belajar": {
      const s = await getLearningSummary(memberId);
      return {
        tahun: s.year,
        total: { jpl_tercapai: s.total.earned, target: s.total.target, persen: s.total.pct },
        per_bucket: s.buckets.map((b) => ({ bucket: BUCKET_LABEL[b.key], jpl: b.earned, target: b.target, persen: b.pct })),
        jumlah_kelas: s.totalClasses, sertifikat: s.certificates,
        _catatan: "jpl_tercapai = total JAM pelajaran terverifikasi yang dihitung ke target (sudah di-cap per kategori), bukan jumlah kelas. jumlah_kelas = banyaknya kegiatan. Keduanya beda satuan.",
      };
    }
    case "get_skill_gap": {
      const sg = await getSkillGap(memberId);
      return {
        tahun: sg.year,
        total_persen: sg.total.pct,
        metode: sg.axes.map((a) => ({ metode: a.name, capaian_jpl: a.earned, target_jpl: a.target, persen: a.pct, sisa_jpl: a.remaining, bucket: a.bucketLabel })),
        rekomendasi_pelatihan: sg.recommendations.map((r) => ({ nama: r.nama, jpl: r.jplTotal, durasi_hari: r.durasiHari, harga: r.harga, menutup_metode: r.fills.map((f) => `${f.name} (+${f.jpl} JPL)`) })),
      };
    }
    case "get_riwayat_pelatihan": {
      const classes = await getMemberClasses(memberId);
      return classes.slice(0, 25).map((c) => ({ nama: c.name, jpl: c.jpl, bucket: c.bucket, terverifikasi: c.verified, ada_sertifikat: c.has_certificate, mulai: c.date_start }));
    }
    case "get_idp": {
      const rows = await query<{ tahun: number | null; area_pengembangan: string | null; aspirasi_pengembangan: string | null; rencana: string | null; status_idp: string | null }>(
        `SELECT tahun, area_pengembangan, aspirasi_pengembangan, rencana, status_idp
           FROM _idp WHERE member_id = ? ORDER BY tahun DESC NULLS LAST, id DESC LIMIT 20`,
        [String(memberId)],
      );
      if (!rows.length) return { catatan: "Belum ada IDP tercatat." };
      return rows.map((r) => ({ tahun: r.tahun, area: clean(r.area_pengembangan), aspirasi: clean(r.aspirasi_pengembangan), rencana: clean(r.rencana), status: clean(r.status_idp) || "draft" }));
    }
    case "cari_pelatihan": {
      const kw = String(args.kata_kunci ?? "").trim();
      if (!kw) return { error: "Kata kunci kosong." };
      const rows = await query<{ nama: string; jpl_total: number | null; durasi_hari: number | null; harga: number | null; deskripsi: string | null }>(
        `SELECT nama, jpl_total, durasi_hari, harga, deskripsi
           FROM _learning_katalog
          WHERE status = 'aktif' AND nama ILIKE ?
          ORDER BY jpl_total DESC NULLS LAST LIMIT 8`,
        [`%${kw}%`],
      );
      return rows.map((r) => {
        const d = clean(r.deskripsi);
        return { nama: clean(r.nama), jpl: Number(r.jpl_total ?? 0), durasi_hari: Number(r.durasi_hari ?? 0), harga: Number(r.harga ?? 0), deskripsi: d.length > 160 ? d.slice(0, 157) + "…" : d };
      });
    }
    default:
      return { error: `Tool tidak dikenal: ${name}` };
  }
}

export interface ChatMsg { role: "user" | "assistant"; content: string }

/** Jalankan satu giliran coach: loop tool-call sampai model memberi jawaban final. */
export async function runCoach(history: ChatMsg[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum di-set di .env.local");
  }
  const client = new OpenAI();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < 6; i++) {
    const res = await client.chat.completions.create({
      model: COACH_MODEL,
      messages,
      tools: TOOLS,
      temperature: 0.5,
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) return msg.content ?? "";

    for (const call of calls) {
      if (call.type !== "function") continue;
      let result: unknown;
      try {
        const parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        result = await runTool(call.function.name, parsed);
      } catch (e) {
        result = { error: e instanceof Error ? e.message : "Gagal menjalankan tool." };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return "Maaf, aku butuh terlalu banyak langkah untuk menjawab itu. Coba persempit pertanyaannya ya.";
}

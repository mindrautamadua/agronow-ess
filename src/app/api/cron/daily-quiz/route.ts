import { query } from "@/lib/db";
import { sendPushToMember, pushEnabled } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tanggal "hari ini" zona Jakarta (YYYY-MM-DD) — selaras dengan /api/microlearning.
function todayJakarta(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/**
 * Hanya boleh dipanggil scheduler. Diizinkan bila header
 * `Authorization: Bearer <CRON_SECRET>` ATAU query `?secret=<CRON_SECRET>` cocok.
 * Vercel Cron otomatis mengirim header Authorization bila env `CRON_SECRET` di-set.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || qs === secret;
}

/**
 * Pengingat Belajar Harian. Kirim Web Push ke member yang punya langganan aktif
 * TAPI belum menyelesaikan kuis hari ini (tidak menggangu yang sudah). Idempoten
 * untuk hari yang sama lewat `tag` notifikasi (notif lama tergantikan).
 */
async function run(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushEnabled) return Response.json({ error: "Push belum dikonfigurasi (VAPID)" }, { status: 503 });

  const today = todayJakarta();
  const rows = await query<{ member_id: number }>(
    `SELECT DISTINCT s.member_id
       FROM ess_push_subscription s
      WHERE s.member_id NOT IN (
        SELECT member_id FROM ess_microlearning_log WHERE tanggal = ?::date
      )`,
    [today],
  );

  const payload = {
    title: "Belajar Harian 🌱",
    body: "Kuis hari ini sudah menanti — jaga streak-mu & raih +5 poin!",
    url: "/harian",
    tag: "daily-quiz",
  };

  let sent = 0;
  for (const r of rows) {
    try { await sendPushToMember(r.member_id, payload); sent++; } catch { /* lanjut ke member berikutnya */ }
  }

  return Response.json({ ok: true, date: today, recipients: rows.length, sent });
}

export const GET = run;   // Vercel Cron memanggil via GET
export const POST = run;  // izinkan POST untuk trigger manual

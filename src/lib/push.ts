/**
 * Web Push (VAPID) — kirim notifikasi OS ke perangkat yang berlangganan, termasuk
 * saat PWA tertutup. Langganan disimpan di `ess_push_subscription`.
 *
 * Nonaktif otomatis bila VAPID env belum di-set (fungsi jadi no-op) supaya app
 * tetap jalan tanpa push.
 */
import webpush from "web-push";
import { query } from "./db";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@agronow.co.id";
export const pushEnabled = Boolean(PUB && PRIV);

if (pushEnabled) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Simpan/replace langganan push milik member. */
export async function saveSubscription(memberId: number, sub: PushSub, ua = ""): Promise<void> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("subscription tidak valid");
  await query(
    `INSERT INTO ess_push_subscription (endpoint, member_id, p256dh, auth, ua, create_date)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET member_id = EXCLUDED.member_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, ua = EXCLUDED.ua`,
    [sub.endpoint, memberId, sub.keys.p256dh, sub.keys.auth, ua.slice(0, 255)],
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await query(`DELETE FROM ess_push_subscription WHERE endpoint = ?`, [endpoint]);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;   // tujuan saat notifikasi diklik
  tag?: string;   // agar notif sejenis menumpuk, bukan menumpuk berlebihan
}

/** Kirim push ke semua perangkat satu member. Langganan mati (404/410) dibersihkan. */
export async function sendPushToMember(memberId: number, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;
  const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
    `SELECT endpoint, p256dh, auth FROM ess_push_subscription WHERE member_id = ?`,
    [memberId],
  );
  if (!subs.length) return;
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await removeSubscription(s.endpoint);
        else console.error("push send error", code ?? e);
      }
    }),
  );
}

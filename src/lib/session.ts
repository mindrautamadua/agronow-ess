/**
 * Sesi login Agronow ESS.
 *
 * Setelah validasi ke API holding (`/api/auth/login`) berhasil, identitas user
 * disimpan di cookie httpOnly `agronow_ess_session`. Isinya ditandatangani
 * HMAC-SHA256 (rahasia `SESSION_SECRET`) agar tidak bisa dipalsukan dari client.
 *
 * Cookie BUKAN enkripsi — payload base64 bisa dibaca, tapi tanda tangannya
 * mencegah modifikasi. Jangan menaruh data sensitif di sini selain identitas.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const SESSION_COOKIE = "agronow_ess_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 jam

export interface SessionPayload {
  memberId: number;
  niksap: string;
  nama: string;
  role: string;
  ptpn: string;
  token: string;
  /** epoch detik saat sesi dibuat */
  ts: number;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Dev fallback — set SESSION_SECRET di .env.local untuk produksi.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET belum di-set (wajib di produksi)");
  }
  return "agronow-ess-dev-secret-change-me";
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Bungkus payload menjadi string cookie bertanda tangan. */
export function encodeSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verifikasi & uraikan string cookie. `null` jika tidak valid / kedaluwarsa. */
export function decodeSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  // Bandingan waktu-konstan untuk cegah timing attack.
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.memberId !== "number") return null;
    if (Date.now() / 1000 - payload.ts > MAX_AGE_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Baca sesi dari cookie request (Server Component / Route Handler). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

/** Pasang cookie sesi pada response (dipanggil di Route Handler). */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Hapus cookie sesi (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

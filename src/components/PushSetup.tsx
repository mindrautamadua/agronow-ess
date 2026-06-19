"use client";

import { useEffect } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function pushPermission(): string {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushResult =
  | "ok"
  | "no-vapid"        // public key belum di-set (env Vercel?)
  | "no-sw"           // service worker tak didukung
  | "unsupported"     // Push/Notification tak ada (mis. iOS belum di-install / < 16.4)
  | "denied"          // izin ditolak user
  | "insecure"        // bukan https/localhost
  | "subscribe-failed"
  | "save-failed";

/**
 * Minta izin (bila perlu) lalu daftarkan langganan Web Push ke server.
 * Mengembalikan alasan spesifik agar UI bisa menjelaskan kegagalan di HP.
 */
export async function enablePush(): Promise<PushResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!VAPID_PUBLIC) return "no-vapid";
  if (!("serviceWorker" in navigator)) return "no-sw";
  // Di iOS, Notification/PushManager baru muncul saat PWA dibuka standalone (16.4+).
  if (!("PushManager" in window) || !("Notification" in window)) return "unsupported";

  if (Notification.permission === "default") {
    const p = await Notification.requestPermission();
    if (p !== "granted") return "denied";
  } else if (Notification.permission !== "granted") {
    return "denied";
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource });
    }
    const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    return r.ok ? "ok" : "save-failed";
  } catch {
    return "subscribe-failed";
  }
}

/** Apakah perangkat ini sedang berlangganan push (terlepas dari status izin). */
export async function pushSubscribed(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Hentikan langganan push di perangkat ini: hapus dari server lalu unsubscribe
 * di browser. Izin notifikasi (Notification.permission) TIDAK bisa dicabut via
 * JS — hanya langganannya yang dilepas, sehingga push berhenti diterima.
 */
export async function disablePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch { /* abaikan */ }
}

export const PUSH_MESSAGE: Record<PushResult, string> = {
  ok: "Notifikasi aktif ✓",
  "no-vapid": "Konfigurasi push belum lengkap di server (VAPID). Hubungi admin.",
  "no-sw": "Browser tidak mendukung service worker.",
  unsupported: "Perangkat/browser belum mendukung. Di iPhone: buka lewat app yang sudah di-Install ke Home Screen (iOS 16.4+).",
  denied: "Izin notifikasi ditolak. Aktifkan lewat Pengaturan situs/app.",
  insecure: "Harus diakses lewat HTTPS (atau install PWA).",
  "subscribe-failed": "Gagal membuat langganan push.",
  "save-failed": "Gagal menyimpan langganan ke server.",
};

/** Mount global: auto-subscribe ulang bila izin sudah diberikan (jaga subscription tetap fresh). */
export default function PushSetup() {
  useEffect(() => {
    if (pushPermission() === "granted") enablePush();
  }, []);
  return null;
}

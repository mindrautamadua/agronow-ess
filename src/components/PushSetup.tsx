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

/**
 * Minta izin (bila perlu) lalu daftarkan langganan Web Push ke server.
 * Aman dipanggil berulang — subscription di-upsert per endpoint.
 */
export async function enablePush(): Promise<boolean> {
  try {
    if (!VAPID_PUBLIC || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
    if (Notification.permission === "default") {
      const p = await Notification.requestPermission();
      if (p !== "granted") return false;
    } else if (Notification.permission !== "granted") {
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource });
    }
    const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Mount global: auto-subscribe ulang bila izin sudah diberikan (jaga subscription tetap fresh). */
export default function PushSetup() {
  useEffect(() => {
    if (pushPermission() === "granted") enablePush();
  }, []);
  return null;
}

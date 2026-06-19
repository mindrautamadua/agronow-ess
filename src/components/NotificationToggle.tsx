"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { enablePush, disablePush, pushPermission, pushSubscribed, PUSH_MESSAGE } from "@/components/PushSetup";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

type State = "loading" | "on" | "off" | "denied" | "unsupported";

/**
 * Toggle notifikasi permanen (di Profile). "Nyala" = berlangganan push; "mati" =
 * unsubscribe (izin browser tetap, tapi push berhenti). Jika izin sebelumnya
 * ditolak/perangkat tak mendukung, toggle dinonaktifkan dengan penjelasan.
 */
export default function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const perm = pushPermission();
    if (!VAPID || perm === "unsupported") { setState("unsupported"); return; }
    if (perm === "denied") { setState("denied"); return; }
    setState((await pushSubscribed()) && perm === "granted" ? "on" : "off");
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true); setNote(null);
    if (state === "on") {
      await disablePush();
      setNote("Notifikasi dimatikan.");
    } else {
      const res = await enablePush();
      if (res !== "ok") setNote(PUSH_MESSAGE[res]);
    }
    await refresh();
    setBusy(false);
  };

  const on = state === "on";
  const disabled = busy || state === "loading" || state === "denied" || state === "unsupported";

  const sub =
    state === "denied" ? "Izin notifikasi diblokir. Aktifkan lewat pengaturan situs/aplikasi di browser."
    : state === "unsupported" ? "Perangkat/browser ini belum mendukung. Di iPhone: buka via PWA yang sudah di-Install (iOS 16.4+)."
    : on ? "Kamu akan menerima info kelas, pengingat belajar harian, dan update tiket Helpdesk."
    : "Aktifkan agar tidak ketinggalan info kelas, pengingat belajar, dan update tiket.";

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/45"}`}>
        {on ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] font-bold">Notifikasi Push</p>
          <button
            role="switch" aria-checked={on} aria-label="Notifikasi push" onClick={toggle} disabled={disabled}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-white/15"}`}
          >
            <span className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[#0d130f] shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}>
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
          </button>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">{sub}</p>
        {note && <p className="mt-2 text-[12px] font-medium text-emerald-300/90">{note}</p>}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, Check } from "lucide-react";

interface NotifItem { id: number; kategori: string; judul: string; isi: string; ref: string | null; read: boolean; tgl: string | null }

const fmt = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

// Bunyi notifikasi via WebAudio (tanpa file aset). Hanya berbunyi setelah ada
// interaksi user (kebijakan autoplay browser).
function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
    o.onended = () => ctx.close();
  } catch { /* abaikan */ }
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnread = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/notif", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items ?? []);
      const u = Number(d.unread) || 0;
      // Bunyi hanya saat jumlah unread NAIK (notif baru masuk), bukan saat awal.
      if (prevUnread.current !== null && u > prevUnread.current) beep();
      prevUnread.current = u;
      setUnread(u);
    } catch { /* offline — abaikan */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAll = async () => {
    await fetch("/api/notif", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    setItems((p) => p.map((i) => ({ ...i, read: true }))); setUnread(0); prevUnread.current = 0;
  };

  const openItem = async (n: NotifItem) => {
    if (!n.read) {
      fetch("/api/notif", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
      setItems((p) => p.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1)); if (prevUnread.current) prevUnread.current -= 1;
    }
    setOpen(false);
    if (n.kategori === "chat" && n.ref) router.push(`/chat?c=${encodeURIComponent(n.ref)}`);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((v) => !v)} className="relative" title="Notifikasi" aria-label="Notifikasi">
        <Bell className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-[#19191B]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[330px] max-w-[90vw] overflow-hidden rounded-xl border border-white/10 bg-[#21241f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-[14px] font-semibold text-white">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-[12px] text-emerald-300 hover:text-emerald-200">
                <Check className="h-3.5 w-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-white/45">Belum ada notifikasi.</p>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition-colors hover:bg-white/5 ${n.read ? "" : "bg-emerald-500/[0.07]"}`}>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="line-clamp-1 text-[13px] font-semibold text-white">{n.judul}</span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12px] text-white/55">{n.isi}</span>
                    <span className="mt-0.5 block text-[11px] text-white/35">{fmt(n.tgl)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

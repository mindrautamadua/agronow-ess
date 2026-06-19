"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, X, Check, Loader2 } from "lucide-react";
import { enablePush, pushPermission } from "@/components/PushSetup";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const SNOOZE_KEY = "ess_push_prompt_snooze";
const DAY = 86_400_000;
const SNOOZE_LATER = 3 * DAY;   // "Nanti" → tanya lagi 3 hari kemudian
const SNOOZE_DENIED = 60 * DAY; // izin ditolak / gagal → jangan ganggu lama

/**
 * Soft pre-prompt notifikasi (best practice): banner kecil yang muncul beberapa
 * detik setelah user masuk, MENGGANTIKAN prompt native langsung. Hanya tampil
 * bila push didukung, izin masih "default", dan tidak sedang di-snooze. Tombol
 * "Aktifkan" memicu prompt asli lewat gesture (syarat iOS). Penolakan/penundaan
 * disimpan di localStorage agar tidak mengganggu.
 */
export default function PushPrompt() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!VAPID) return;                               // push belum dikonfigurasi
    if (pathname?.startsWith("/login")) return;       // jangan di halaman login
    if (pushPermission() !== "default") return;       // granted/denied/unsupported → tak relevan
    try {
      if (Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0)) return;
    } catch { /* localStorage diblok → tetap boleh tampil */ }
    const t = setTimeout(() => setShow(true), 2500);  // beri jeda, jangan kagetkan
    return () => clearTimeout(t);
  }, [pathname]);

  const snooze = (ms: number) => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + ms)); } catch { /* abaikan */ }
    setShow(false);
  };

  const activate = async () => {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res === "ok") {
      setOk(true);
      setTimeout(() => setShow(false), 1400);
    } else {
      // Ditolak di prompt native / perangkat tak siap → simpan & jangan ulang cepat.
      snooze(SNOOZE_DENIED);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-white/12 bg-[#1b1f1c]/95 p-4 shadow-2xl backdrop-blur">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
              {ok ? <Check className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              {ok ? (
                <p className="py-1.5 text-[14px] font-semibold text-emerald-300">Notifikasi aktif ✓</p>
              ) : (
                <>
                  <p className="text-[14px] font-bold text-white">Aktifkan Notifikasi</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/60">
                    Biar kamu tidak ketinggalan info kelas, pengingat belajar harian, dan update tiket Helpdesk.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={activate} disabled={busy}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-bold text-[#0d130f] transition-colors hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</> : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => snooze(SNOOZE_LATER)} disabled={busy}
                      className="rounded-lg px-3 py-2 text-[13px] font-semibold text-white/65 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
                    >
                      Nanti
                    </button>
                  </div>
                </>
              )}
            </div>
            {!ok && (
              <button onClick={() => snooze(SNOOZE_LATER)} aria-label="Tutup" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

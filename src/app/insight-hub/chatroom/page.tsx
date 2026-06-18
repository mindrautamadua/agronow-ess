"use client";

/**
 * Chatroom — Direct Message 1-to-1 antar member.
 *  - Sidebar: daftar percakapan (`/api/chat/conversations`) + tombol "Pesan Baru"
 *    untuk mencari orang (`/api/chat/search?q=`).
 *  - Panel: stream pesan satu percakapan (`/api/chat/messages?kode=`), polling tiap
 *    5 dtk lewat ?after=<timestamp>. Kirim: POST /api/chat/messages { toId, text }
 *    (percakapan dibuat otomatis bila belum ada). Membuka percakapan menandai dibaca.
 *  - Deep-link ?c=<kode_chat> membuka percakapan langsung (mis. dari notifikasi).
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Skeleton } from "@/components/Skeleton";
import { ArrowLeft, MessageCircle, Search, X, Send, MessagesSquare, PenSquare } from "lucide-react";

interface Conversation {
  kode: string; friendId: number; friendName: string; friendImg: string | null;
  lastText: string; lastTgl: string | null; lastFromMe: boolean; unread: number;
}
interface Message { id: string; fromMe: boolean; text: string; tgl: string | null }
interface MemberLite { id: number; name: string; img: string | null; jabatan: string | null }
interface ActiveChat { kode: string | null; id: number; name: string; img: string | null; jabatan?: string | null }

const POLL_MS = 5000;

const fmtJam = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};
const fmtTgl = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  return d.toDateString() === new Date().toDateString() ? fmtJam(s) : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const fmtPemisah = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Avatar member — foto bila URL valid, jika gagal/null jatuh ke inisial. */
function Avatar({ name, src, size = "md" }: { name: string; src: string | null; size?: "md" | "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-11 w-11 text-[15px]" : "h-10 w-10 text-[13px]";
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} onError={() => setFailed(true)} className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-white/10`} />;
  }
  return (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-green-800 font-bold text-white ring-1 ring-white/10`}>
      {initialsOf(name)}
    </div>
  );
}

function ChatroomInner() {
  const sp = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [composing, setComposing] = useState(false); // mode "pesan baru"

  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/conversations");
      const j = await r.json();
      if (!Array.isArray(j.items)) throw new Error("bad payload");
      setConversations(j.items);
      setErr(false);
      return j.items as Conversation[];
    } catch {
      setErr(true);
      return [] as Conversation[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Refresh ringan daftar percakapan (last message / unread) tiap 12 dtk.
  useEffect(() => {
    const t = setInterval(loadConversations, 12000);
    return () => clearInterval(t);
  }, [loadConversations]);

  // Deep-link ?c=<kode> → buka percakapan yang cocok setelah daftar termuat.
  const deepLink = sp.get("c");
  useEffect(() => {
    if (!deepLink || active) return;
    const c = conversations.find((x) => x.kode === deepLink);
    if (c) setActive({ kode: c.kode, id: c.friendId, name: c.friendName, img: c.friendImg });
  }, [deepLink, conversations, active]);

  const openConversation = (c: Conversation) => {
    setComposing(false);
    setActive({ kode: c.kode, id: c.friendId, name: c.friendName, img: c.friendImg });
  };

  const openPerson = (p: MemberLite) => {
    const existing = conversations.find((c) => c.friendId === p.id);
    setComposing(false);
    setActive({ kode: existing?.kode ?? null, id: p.id, name: p.name, img: p.img, jabatan: p.jabatan });
  };

  return (
    <div className="flex h-screen flex-col bg-[#19191B] text-white">
      <AppHeader active="Insight Hub" />

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col overflow-hidden px-0 sm:px-4 sm:pb-4">
        <div className="hidden px-4 pt-4 sm:block sm:px-0">
          <a href="/insight-hub" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-emerald-300">
            <ArrowLeft className="h-4 w-4" /> Insight Hub
          </a>
          <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold">
            <MessageCircle className="h-6 w-6 text-emerald-400" /> Chatroom
            <span className="text-[13px] font-normal text-white/40">· Pesan pribadi</span>
          </h1>
        </div>

        <div className="mt-0 flex flex-1 overflow-hidden sm:mt-4 sm:rounded-2xl sm:border sm:border-white/10">
          {/* Sidebar daftar percakapan */}
          <aside className={`flex w-full flex-col border-white/10 sm:w-[330px] sm:border-r ${active ? "hidden sm:flex" : "flex"}`}>
            <div className="flex items-center gap-2 border-b border-white/10 p-3">
              <span className="flex-1 text-[13px] font-semibold text-white/70">Percakapan</span>
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <PenSquare className="h-3.5 w-3.5" /> Pesan Baru
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : err ? (
                <p className="m-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">Gagal memuat percakapan.</p>
              ) : conversations.length === 0 ? (
                <div className="m-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-[13px] text-white/50">
                  Belum ada percakapan.<br />Mulai lewat <span className="text-emerald-300">Pesan Baru</span>.
                </div>
              ) : (
                <ul>
                  {conversations.map((c) => (
                    <li key={c.kode}>
                      <button
                        type="button"
                        onClick={() => openConversation(c)}
                        className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] ${active?.id === c.friendId ? "bg-white/[0.06]" : ""}`}
                      >
                        <Avatar name={c.friendName} src={c.friendImg} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[14px] font-semibold text-white">{c.friendName}</p>
                            {c.lastTgl && <span className="shrink-0 text-[11px] text-white/40">{fmtTgl(c.lastTgl)}</span>}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className={`truncate text-[12.5px] ${c.unread > 0 ? "font-medium text-white/80" : "text-white/50"}`}>
                              {c.lastText ? <>{c.lastFromMe && <span className="text-white/40">Anda: </span>}{c.lastText}</> : "Belum ada pesan"}
                            </p>
                            {c.unread > 0 && (
                              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Panel chat / pencarian orang */}
          <section className={`flex-1 flex-col ${active || composing ? "flex" : "hidden sm:flex"}`}>
            {composing ? (
              <NewChatPanel onPick={openPerson} onBack={() => setComposing(false)} />
            ) : active ? (
              <ChatPanel key={active.id} chat={active} onBack={() => setActive(null)} onConversationChanged={loadConversations} onKode={(kode) => setActive((a) => (a ? { ...a, kode } : a))} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-white/40">
                <MessagesSquare className="h-12 w-12 text-emerald-400/50" />
                <p className="text-[14px]">Pilih percakapan atau mulai <span className="text-emerald-300">Pesan Baru</span>.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Pencarian orang untuk memulai DM baru. */
function NewChatPanel({ onPick, onBack }: { onPick: (p: MemberLite) => void; onBack: () => void }) {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MemberLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (q.length < 2) { setItems([]); return; }
    let alive = true;
    setLoading(true);
    fetch(`/api/chat/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setItems(Array.isArray(j.items) ? j.items : []); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [q]);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-3 py-3">
        <button onClick={onBack} aria-label="Kembali" className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 sm:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-[13.5px] text-white placeholder:text-white/35 outline-none focus:border-emerald-500/60"
          />
          {qInput && (
            <button onClick={() => setQInput("")} aria-label="Hapus pencarian" className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#141416]">
        {q.length < 2 ? (
          <p className="p-8 text-center text-[13.5px] text-white/40">Ketik minimal 2 huruf untuk mencari rekan.</p>
        ) : loading ? (
          <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-[13.5px] text-white/40">Tidak ada hasil untuk &quot;{q}&quot;.</p>
        ) : (
          <ul>
            {items.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04]">
                  <Avatar name={p.name} src={p.img} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">{p.name}</p>
                    {p.jabatan && <p className="truncate text-[12px] text-white/45">{p.jabatan}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Stream pesan satu percakapan + composer. */
function ChatPanel({ chat, onBack, onConversationChanged, onKode }: {
  chat: ActiveChat; onBack: () => void; onConversationChanged: () => void; onKode: (kode: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!chat.kode);
  const [err, setErr] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const kodeRef = useRef<string | null>(chat.kode);
  const lastTsRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const mergeMessages = useCallback((fresh: Message[]) => {
    if (!fresh.length) return;
    lastTsRef.current = fresh[fresh.length - 1].tgl ?? lastTsRef.current;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = fresh.filter((m) => !seen.has(m.id));
      return add.length ? [...prev, ...add] : prev;
    });
  }, []);

  // Muat awal (hanya bila percakapan sudah ada / punya kode).
  useEffect(() => {
    if (!chat.kode) { setMessages([]); setLoading(false); return; }
    let alive = true;
    setLoading(true); setErr(false);
    fetch(`/api/chat/messages?kode=${encodeURIComponent(chat.kode)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const items: Message[] = Array.isArray(j.items) ? j.items : [];
        setMessages(items);
        lastTsRef.current = items.length ? items[items.length - 1].tgl : null;
        onConversationChanged(); // unread → 0
      })
      .catch(() => { if (alive) setErr(true); })
      .finally(() => { if (alive) { setLoading(false); requestAnimationFrame(() => scrollToEnd()); } });
    return () => { alive = false; };
  }, [chat.kode, scrollToEnd, onConversationChanged]);

  // Polling pesan baru.
  useEffect(() => {
    const t = setInterval(async () => {
      const kode = kodeRef.current;
      if (!kode) return;
      try {
        const url = `/api/chat/messages?kode=${encodeURIComponent(kode)}${lastTsRef.current ? `&after=${encodeURIComponent(lastTsRef.current)}` : ""}`;
        const j = await (await fetch(url)).json();
        const fresh: Message[] = Array.isArray(j.items) ? j.items : [];
        if (fresh.length) {
          const el = scrollRef.current;
          const nearBottom = el && el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          mergeMessages(fresh);
          onConversationChanged();
          if (nearBottom) requestAnimationFrame(() => scrollToEnd(true));
        }
      } catch { /* abaikan error polling */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [scrollToEnd, mergeMessages, onConversationChanged]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setSendErr("");
    try {
      const r = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: chat.id, text: body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.message) { setSendErr(j?.error ?? "Gagal mengirim pesan."); return; }
      const msg: Message = j.message;
      // Percakapan baru → simpan kode untuk polling & angkat ke parent.
      if (!kodeRef.current && j.kode) { kodeRef.current = j.kode; onKode(j.kode); }
      lastTsRef.current = msg.tgl ?? lastTsRef.current;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText("");
      requestAnimationFrame(() => scrollToEnd(true));
      onConversationChanged();
    } catch {
      setSendErr("Tidak dapat terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <>
      {/* Header percakapan */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-3 py-3">
        <button onClick={onBack} aria-label="Kembali" className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 sm:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={chat.name} src={chat.img} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{chat.name}</p>
          {chat.jabatan && <p className="truncate text-[12px] text-white/45">{chat.jabatan}</p>}
        </div>
      </div>

      {/* Stream pesan */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-[#141416] px-3 py-4 sm:px-4">
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)}</div>
        ) : err ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">Gagal memuat pesan.</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/40">
            <MessageCircle className="h-10 w-10 text-emerald-400/40" />
            <p className="text-[13.5px]">Belum ada pesan. Sapa {chat.name.split(/\s+/)[0]}!</p>
          </div>
        ) : (
          messages.map((m) => {
            const day = fmtPemisah(m.tgl);
            const showDay = day && day !== lastDay;
            if (showDay) lastDay = day;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/50">{day}</span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${m.fromMe ? "flex-row-reverse" : ""}`}>
                  {!m.fromMe && <Avatar name={chat.name} src={chat.img} size="sm" />}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${m.fromMe ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md bg-white/[0.06] text-white/90"}`}>
                    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{m.text || <span className="italic text-white/40">(pesan kosong)</span>}</p>
                    <p className={`mt-0.5 text-right text-[10.5px] ${m.fromMe ? "text-white/70" : "text-white/35"}`}>{fmtJam(m.tgl)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="border-t border-white/10 bg-white/[0.02] p-3">
        {sendErr && <p className="mb-1.5 text-[12px] text-red-300">{sendErr}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={1}
            maxLength={2000}
            placeholder={`Tulis pesan ke ${chat.name.split(/\s+/)[0]}…`}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-500/60"
          />
          <button type="submit" disabled={sending || !text.trim()} aria-label="Kirim" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </>
  );
}

export default function ChatroomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#19191B] text-white"><AppHeader active="Insight Hub" /><p className="mx-auto max-w-[1100px] px-4 py-10 text-white/50">Memuat…</p></div>}>
      <ChatroomInner />
    </Suspense>
  );
}

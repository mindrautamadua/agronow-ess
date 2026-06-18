"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { enablePush, pushPermission } from "@/components/PushSetup";
import { ArrowLeft, Search, Send, X, BellRing, MessageSquarePlus } from "lucide-react";

interface Conversation { kode: string; friendId: number; friendName: string; friendImg: string | null; lastText: string; lastTgl: string | null; lastFromMe: boolean; unread: number }
interface Message { id: string; fromMe: boolean; text: string; tgl: string | null }
interface MemberLite { id: number; name: string; img: string | null; jabatan: string | null }

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const fmtTime = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

function Avatar({ name, src, className = "h-10 w-10" }: { name: string; src: string | null; className?: string }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} onError={() => setBad(true)} className={`${className} shrink-0 rounded-full object-cover ring-1 ring-white/10`} />;
  }
  return <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-green-800 text-[13px] font-bold text-white ring-1 ring-white/10`}>{initials(name)}</div>;
}

function ChatInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeKode, setActiveKode] = useState<string | null>(null);
  const [friend, setFriend] = useState<MemberLite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<MemberLite[]>([]);
  const [pushPerm, setPushPerm] = useState<string>("default");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPushPerm(pushPermission()); }, []);

  const loadConvos = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/conversations", { cache: "no-store" });
      if (r.ok) setConvos((await r.json()).items ?? []);
    } catch { /* abaikan */ }
  }, []);

  useEffect(() => { loadConvos(); const t = setInterval(loadConvos, 12000); return () => clearInterval(t); }, [loadConvos]);

  // Buka percakapan dari URL: ?c=<kode> atau ?to=<memberId>.
  useEffect(() => {
    const c = sp.get("c"); const to = sp.get("to");
    if (c) openConversation(c);
    else if (to) startWith(Number(to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollDown = () => requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; });

  const loadMessages = useCallback(async (kode: string) => {
    try {
      const r = await fetch(`/api/chat/messages?kode=${encodeURIComponent(kode)}`, { cache: "no-store" });
      if (r.ok) { setMessages((await r.json()).items ?? []); scrollDown(); }
    } catch { /* abaikan */ }
  }, []);

  async function openConversation(kode: string) {
    setNewChat(false); setActiveKode(kode);
    const conv = convos.find((c) => c.kode === kode);
    if (conv) setFriend({ id: conv.friendId, name: conv.friendName, img: conv.friendImg, jabatan: null });
    await loadMessages(kode);
    loadConvos();
  }

  async function startWith(memberId: number) {
    if (!memberId) return;
    setNewChat(false);
    try {
      const r = await fetch(`/api/chat/search?id=${memberId}`);
      const m = (await r.json()).member as MemberLite | null;
      if (!m) return;
      setFriend(m);
      const existing = convos.find((c) => c.friendId === memberId);
      if (existing) { setActiveKode(existing.kode); await loadMessages(existing.kode); }
      else { setActiveKode(null); setMessages([]); }
    } catch { /* abaikan */ }
  }

  // Polling pesan saat percakapan terbuka.
  useEffect(() => {
    if (!activeKode) return;
    const t = setInterval(() => loadMessages(activeKode), 4000);
    const onVis = () => { if (document.visibilityState === "visible") loadMessages(activeKode); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [activeKode, loadMessages]);

  // Pencarian member (debounce).
  useEffect(() => {
    if (!newChat) return;
    const t = setTimeout(async () => {
      if (searchQ.trim().length < 2) { setResults([]); return; }
      try { const r = await fetch(`/api/chat/search?q=${encodeURIComponent(searchQ)}`); setResults((await r.json()).items ?? []); } catch { /* */ }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, newChat]);

  async function send() {
    const body = text.trim();
    if (!body || !friend || sending) return;
    setSending(true);
    try {
      const r = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toId: friend.id, text: body }) });
      const d = await r.json();
      if (r.ok && d.message) {
        setText("");
        setActiveKode(d.kode);
        setMessages((p) => [...p, d.message]); scrollDown();
        loadConvos();
      }
    } finally { setSending(false); }
  }

  const backToList = () => { setActiveKode(null); setFriend(null); setMessages([]); setNewChat(false); router.replace("/chat"); };
  const showThread = !!friend; // mobile: tampilkan thread bila ada teman aktif

  return (
    <div className="flex h-[100dvh] flex-col bg-[#19191B] text-white">
      <AppHeader active="Insight Hub" />
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 overflow-hidden px-0 sm:px-4 sm:py-4">
        <div className="flex w-full overflow-hidden rounded-none border-white/10 sm:rounded-2xl sm:border">
          {/* ── Daftar percakapan ── */}
          <aside className={`${showThread ? "hidden md:flex" : "flex"} w-full flex-col border-r border-white/10 md:w-[320px]`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
              <h2 className="text-[15px] font-bold">Pesan</h2>
              <button onClick={() => { setNewChat(true); setFriend(null); setActiveKode(null); }} title="Chat baru"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500">
                <MessageSquarePlus className="h-4.5 w-4.5" />
              </button>
            </div>

            {pushPerm !== "granted" && (
              <button onClick={async () => { await enablePush(); setPushPerm(pushPermission()); }}
                className="flex items-center gap-2 border-b border-white/10 bg-emerald-500/10 px-3 py-2.5 text-left text-[12.5px] text-emerald-200 hover:bg-emerald-500/15">
                <BellRing className="h-4 w-4 shrink-0" /> Aktifkan notifikasi pesan
              </button>
            )}

            <div className="flex-1 overflow-y-auto">
              {convos.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-white/45">Belum ada percakapan. Mulai chat baru.</p>
              ) : convos.map((c) => (
                <button key={c.kode} onClick={() => openConversation(c.kode)}
                  className={`flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-3 text-left transition-colors hover:bg-white/5 ${activeKode === c.kode ? "bg-white/[0.06]" : ""}`}>
                  <Avatar name={c.friendName} src={c.friendImg} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-semibold">{c.friendName}</p>
                      <span className="shrink-0 text-[11px] text-white/35">{fmtTime(c.lastTgl)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] text-white/50">{c.lastFromMe ? "Kamu: " : ""}{c.lastText}</p>
                      {c.unread > 0 && <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-white">{c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Panel kanan: thread / chat baru / kosong ── */}
          <section className={`${showThread || newChat ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
            {newChat ? (
              <>
                <div className="flex items-center gap-2 border-b border-white/10 p-3">
                  <button onClick={backToList} className="md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input autoFocus value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Cari nama / NIK karyawan…"
                      className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-emerald-500/60" />
                  </div>
                  <button onClick={() => setNewChat(false)}><X className="h-5 w-5 text-white/60" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {searchQ.trim().length < 2 ? (
                    <p className="px-4 py-8 text-center text-[13px] text-white/45">Ketik minimal 2 huruf untuk mencari.</p>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[13px] text-white/45">Tidak ada hasil.</p>
                  ) : results.map((m) => (
                    <button key={m.id} onClick={() => startWith(m.id)}
                      className="flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-3 text-left hover:bg-white/5">
                      <Avatar name={m.name} src={m.img} />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold">{m.name}</p>
                        {m.jabatan && <p className="truncate text-[12px] text-white/45">{m.jabatan}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : !friend ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/40">
                <MessageSquarePlus className="h-12 w-12 text-emerald-400/50" />
                <p className="mt-3 text-[14px]">Pilih percakapan atau mulai chat baru.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 p-3">
                  <button onClick={backToList} className="md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                  <Avatar name={friend.name} src={friend.img} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{friend.name}</p>
                    {friend.jabatan && <p className="truncate text-[12px] text-white/45">{friend.jabatan}</p>}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-white/40">Belum ada pesan. Sapa duluan 👋</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${m.fromMe ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm bg-white/[0.08] text-white/90"}`}>
                        {m.text}
                        <span className={`ml-2 inline-block align-bottom text-[10px] ${m.fromMe ? "text-white/70" : "text-white/40"}`}>{fmtTime(m.tgl)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-white/10 p-3">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Tulis pesan…" maxLength={2000}
                    className="max-h-32 flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[13.5px] outline-none focus:border-emerald-500/60" />
                  <button type="submit" disabled={sending || !text.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#19191B]" />}>
      <ChatInner />
    </Suspense>
  );
}

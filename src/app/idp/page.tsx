"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Target, Plus, FileText, Clock, CheckCircle2, AlertCircle, X, Loader2, Info, Upload } from "lucide-react";

interface IdpItem {
  id: number; tahun: number | null; area: string; aspirasi: string; rencana: string; deskripsi: string;
  tanggal: string | null; jam: string | null; status: string; status_verifikasi: string; catatan: string;
}

const fmtDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function statusTone(s: string) {
  const v = s.toLowerCase();
  if (v.includes("terima") || v.includes("approve") || v.includes("selesai")) return "bg-emerald-500/15 text-emerald-300";
  if (v.includes("reject") || v.includes("tolak")) return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

export default function IdpPage() {
  const [data, setData] = useState<{ year: number; items: IdpItem[] } | null>(null);
  const [err, setErr] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    fetch("/api/idp").then((r) => r.json()).then((d) => { d.items ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const year = data?.year ?? new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1000px] px-4 pb-20">
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Individual Development Program</h1>
            <p className="mt-1 text-[14px] text-white/60">Rencana pengembangan diri (IDP) tahun {year}.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Buat IDP
          </button>
        </div>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}
        {!data && !err && (
          <section className="mt-6 space-y-4">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="p-5">
                <div className="flex items-center justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-28 rounded-full" /></div>
                <Skeleton className="mt-4 h-3 w-32" /><Skeleton className="mt-2 h-4 w-3/4" />
                <Skeleton className="mt-4 h-3 w-40" />
              </SkeletonCard>
            ))}
          </section>
        )}

        {data && data.items.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Target className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-bold">Belum ada IDP</h2>
            <p className="mt-1 max-w-md text-[13.5px] text-white/55">
              Susun rencana pengembangan dirimu — isikan area, aspirasi karir, dan rencana belajar untuk tahun ini.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-[13px] font-semibold transition hover:bg-white/10"
            >
              <FileText className="h-4 w-4" /> Isi Formulir IDP
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <section className="mt-6 space-y-4">
            {data.items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-white/60">IDP {it.tahun ?? ""}</span>
                  <div className="flex items-center gap-2">
                    {it.status_verifikasi && <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusTone(it.status_verifikasi)}`}>{it.status_verifikasi}</span>}
                    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusTone(it.status)}`}>{it.status}</span>
                  </div>
                </div>
                {it.area && <Field label="Area Pengembangan" value={it.area} />}
                {it.aspirasi && <Field label="Aspirasi Pengembangan" value={it.aspirasi} />}
                {it.rencana && <Field label="Rencana" value={it.rencana} />}
                <div className="mt-3 flex flex-wrap gap-4 text-[12.5px] text-white/55">
                  {fmtDate(it.tanggal) && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(it.tanggal)}{it.jam ? ` · ${it.jam}` : ""}</span>}
                </div>
                {it.catatan && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[12.5px] text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Catatan verifikator: {it.catatan}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] text-white/55">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> IDP yang dikirim akan berstatus <span className="font-semibold text-white/70">sedang direview</span> menunggu verifikasi.
        </div>
      </main>

      {showForm && (
        <IdpForm
          year={year}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setData(null); setErr(false); load(); }}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-0.5 text-[14px] leading-relaxed text-white/85">{value}</div>
    </div>
  );
}

function IdpForm({ year, onClose, onSaved }: { year: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    tahun: String(year), area: "", aspirasi: "", rencana: "", deskripsi: "",
    summary: "", lokasi: "", tanggal: "", jamMulai: "", jamSelesai: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.area.trim() || !form.aspirasi.trim() || !form.rencana.trim()) {
      setError("Area, aspirasi, dan rencana wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let dokumentasi = "";
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/idp/upload", { method: "POST", body: fd });
        const ud = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(ud?.error || "Gagal mengunggah dokumentasi");
        dokumentasi = ud.url;
      }
      const res = await fetch("/api/idp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dokumentasi }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Gagal menyimpan IDP");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan IDP");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#202023] p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Formulir IDP {form.tahun}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-white/55">Laporkan hasil development dialog bersama atasan. Field bertanda <span className="text-emerald-400">*</span> wajib.</p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
            <Info className="h-4 w-4 text-emerald-400" /> Informasi
          </div>
          <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-white/55">
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Halaman ini digunakan untuk melaporkan hasil development dialog yang telah kamu lakukan bersama atasan.</li>
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Tanggal pelaksanaan, jam mulai &amp; selesai, serta lokasi pelaksanaan diisi sesuai dengan pelaksanaan development dialog.</li>
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Kolom dokumentasi diisi dengan bukti development dialog dalam bentuk file PDF.</li>
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Tuliskan hasil development dialog, area pengembangan, aspirasi pengembangan dan rencana pengembanganmu.</li>
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Setelah laporan dikirim (data disubmit), data akan diperiksa oleh verifikator (bagian SDM) terlebih dahulu.</li>
            <li className="flex gap-2"><span className="text-emerald-400/70">•</span> Apabila data diterima, maka individual development program kamu sudah selesai dan siap belajar!</li>
          </ul>
        </div>

        <div className="mt-4 grid gap-4">
          <Input label="Tahun" type="number" value={form.tahun} onChange={set("tahun")} />
          <Input label="Lokasi Pelaksanaan" value={form.lokasi} onChange={set("lokasi")} placeholder="mis. Kantor Pusat / Online" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Pelaksanaan" type="date" value={form.tanggal} onChange={set("tanggal")} />
            <div />
            <Input label="Jam Mulai" type="time" value={form.jamMulai} onChange={set("jamMulai")} />
            <Input label="Jam Selesai" type="time" value={form.jamSelesai} onChange={set("jamSelesai")} />
          </div>
          <FileInput label="Dokumentasi (PDF)" file={file} onPick={setFile} />
          <TextArea label="Hasil Development Dialog" value={form.summary} onChange={set("summary")} placeholder="Ringkasan hasil development dialog bersama atasan" />
          <TextArea label="Area Pengembangan" required value={form.area} onChange={set("area")} placeholder="Kompetensi / area yang ingin dikembangkan" />
          <TextArea label="Aspirasi Pengembangan" required value={form.aspirasi} onChange={set("aspirasi")} placeholder="Aspirasi karir / tujuan pengembangan" />
          <TextArea label="Rencana Pengembangan" required value={form.rencana} onChange={set("rencana")} placeholder="Rencana belajar / aksi konkret" />
          <TextArea label="Deskripsi Pengembangan" value={form.deskripsi} onChange={set("deskripsi")} placeholder="Penjelasan tambahan (opsional)" />
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-white/5">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-[13px] font-semibold transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Menyimpan…" : "Kirim IDP"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ label, required, ...rest }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-white/60">{label}{required && <span className="text-emerald-400"> *</span>}</span>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white outline-none transition placeholder:text-white/30 focus:border-emerald-500/50 focus:bg-white/[0.06] [color-scheme:dark]"
      />
    </label>
  );
}

function FileInput({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  return (
    <div>
      <span className="text-[12px] font-medium text-white/60">{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-white/10">
          <Upload className="h-4 w-4" /> {file ? "Ganti file" : "Pilih PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
        {file ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-white/70">
            <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => onPick(null)} className="shrink-0 rounded p-0.5 text-white/50 hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </span>
        ) : (
          <span className="text-[12px] text-white/35">Maks 10 MB · PDF saja</span>
        )}
      </div>
    </div>
  );
}

function TextArea({ label, required, ...rest }: { label: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-white/60">{label}{required && <span className="text-emerald-400"> *</span>}</span>
      <textarea
        {...rest}
        rows={3}
        className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] leading-relaxed text-white outline-none transition placeholder:text-white/30 focus:border-emerald-500/50 focus:bg-white/[0.06]"
      />
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import {
  Mail, Phone, MapPin, Briefcase, Building2, Calendar, User as UserIcon,
  BookOpen, Award, Clock, Star,
} from "lucide-react";

interface Profile {
  member: {
    name: string; nip: string | null; nip_sap: string | null; email: string | null;
    jabatan: string | null; kel_jabatan: string | null; unit: string | null;
    image: string | null; gender: string | null; phone: string | null;
    birth_place: string | null; birth_date: string | null; address: string | null;
    city: string | null; province: string | null; join_date: string | null;
    poin: number; saldo: number; status: string | null;
  };
  stats: { totalClasses: number; certificates: number; jplEarned: number; jplTarget: number };
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const fmtDate = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300"><Icon className="h-4.5 w-4.5" /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
        <div className="truncate text-[14px] font-medium">{value || "-"}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => { d.member ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

  const m = data?.member;
  const s = data?.stats;

  const STATS = [
    { icon: BookOpen, label: "Kelas Diikuti", value: s?.totalClasses ?? "—", tone: "text-emerald-300 bg-emerald-500/15" },
    { icon: Award, label: "Sertifikat", value: s?.certificates ?? "—", tone: "text-amber-300 bg-amber-500/15" },
    { icon: Clock, label: "JPL (Jam)", value: s ? `${s.jplEarned}/${s.jplTarget}` : "—", tone: "text-sky-300 bg-sky-500/15" },
    { icon: Star, label: "Poin", value: m?.poin ?? "—", tone: "text-yellow-300 bg-yellow-500/15" },
  ];

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader active="Profile" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Profil Saya</h1>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data profil.</p>}

        {!data && !err && (
          <>
            {/* Kartu identitas skeleton */}
            <section className="mt-5 overflow-hidden rounded-3xl border border-white/10">
              <div className="h-28 bg-white/[0.04]" />
              <div className="-mt-14 px-6 pb-6">
                <div className="flex items-end gap-4">
                  <Skeleton className="h-28 w-28 rounded-2xl border-4 border-[#19191B]" />
                  <div className="pb-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="mt-2 h-4 w-36" />
                  </div>
                </div>
              </div>
            </section>
            <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1"><Skeleton className="h-5 w-12" /><Skeleton className="mt-1.5 h-3 w-16" /></div>
                </SkeletonCard>
              ))}
            </section>
            <section className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} className="flex items-start gap-3 p-3.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="mt-1.5 h-4 w-40" /></div>
                </SkeletonCard>
              ))}
            </section>
          </>
        )}

        {m && (
          <>
            {/* Kartu identitas */}
            <section className="mt-5 overflow-hidden rounded-3xl border border-white/10">
              <div className="h-28 bg-gradient-to-r from-[#2F840B] to-[#0c1f08]" />
              <div className="-mt-14 px-6 pb-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                  <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-[#19191B] bg-emerald-700">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold">{initials(m.name)}</div>
                    )}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl font-bold">{m.name}</h2>
                    <p className="text-[15px] text-emerald-300">{m.jabatan || "-"}</p>
                    <p className="text-[13px] text-white/50">{m.kel_jabatan || ""}</p>
                  </div>
                  <span className={`mb-1 ml-auto rounded-full px-3 py-1 text-[12px] font-semibold ${m.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                    {m.status === "active" ? "Aktif" : m.status || "-"}
                  </span>
                </div>
              </div>
            </section>

            {/* Stat ringkas */}
            <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((st) => {
                const Icon = st.icon;
                return (
                  <div key={st.label} className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${st.tone}`}><Icon className="h-5 w-5" /></div>
                    <div>
                      <div className="text-xl font-bold leading-none">{st.value}</div>
                      <div className="mt-1 text-[12px] text-white/50">{st.label}</div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Detail */}
            <section className="mt-5 grid gap-4 md:grid-cols-2">
              <Info icon={UserIcon} label="NIK" value={m.nip} />
              <Info icon={Briefcase} label="Unit Kerja" value={m.unit} />
              <Info icon={Mail} label="Email" value={m.email} />
              <Info icon={Phone} label="Telepon" value={m.phone} />
              <Info icon={Building2} label="Kelompok Jabatan" value={m.kel_jabatan} />
              <Info icon={Calendar} label="Tanggal Masuk" value={fmtDate(m.join_date)} />
              <Info icon={UserIcon} label="Jenis Kelamin" value={m.gender} />
              <Info icon={Calendar} label="Tanggal Lahir" value={m.birth_date ? `${m.birth_place ? m.birth_place + ", " : ""}${fmtDate(m.birth_date)}` : (m.birth_place || "-")} />
              <Info icon={MapPin} label="Kota / Provinsi" value={[m.city, m.province].filter(Boolean).join(", ") || null} />
              <Info icon={MapPin} label="Alamat" value={m.address} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

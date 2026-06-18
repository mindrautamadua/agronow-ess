/**
 * Klien API AGHRIS (holding PT Perkebunan Nusantara) untuk data yang tidak ada
 * di DB app — mis. pemetaan atasan→bawahan karpim. Key & base URL dapat dioverride
 * lewat env; default memakai kredensial AGHRIS_MOBILE.
 */
const AGHRIS_BASE = process.env.AGHRIS_BASE_URL ?? "https://apis.holding-perkebunan.com/aghris";
const AGHRIS_KEY = process.env.AGHRIS_API_KEY ?? "270F672B-3CEF-4C6C-A362-359B8B0CAEA1";
const AGHRIS_USER_ACCESS = process.env.AGHRIS_USER_ACCESS ?? "AGHRIS_MOBILE";

export interface BawahanKarpim {
  nikSap: string;
  nama: string;
  psa: string | null;
  tahun: string | null;
}

interface MappingRow {
  nik_sap_bawahan?: string;
  nama_bawahan?: string;
  psa?: string;
  tahun?: string;
}

/**
 * Daftar bawahan karpim seorang atasan berdasarkan NIK SAP-nya.
 * Endpoint: `get_mapping_atasan_bawahan_karpim.php`. Melempar bila HTTP/JSON gagal.
 */
export async function getBawahanKarpim(nikSapAtasan: string): Promise<BawahanKarpim[]> {
  const nik = nikSapAtasan.trim();
  if (!nik) return [];

  const url = new URL(`${AGHRIS_BASE}/get_mapping_atasan_bawahan_karpim.php`);
  url.searchParams.set("user-access", AGHRIS_USER_ACCESS);
  url.searchParams.set("key", AGHRIS_KEY);
  url.searchParams.set("nik_sap_atasan", nik);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`AGHRIS HTTP ${res.status}`);

  // Respons kadang diawali BOM (﻿) → strip dulu sebelum JSON.parse.
  const text = (await res.text()).replace(/^﻿/, "");
  const json = JSON.parse(text) as { status?: string; data?: MappingRow[] };
  if (json.status !== "OK" || !Array.isArray(json.data)) return [];

  return json.data
    .map((r) => ({
      nikSap: String(r.nik_sap_bawahan ?? "").trim(),
      nama: String(r.nama_bawahan ?? "").trim(),
      psa: r.psa?.trim() || null,
      tahun: r.tahun?.trim() || null,
    }))
    .filter((b) => b.nikSap);
}

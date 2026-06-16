/** Bersihkan HTML entity & tag dari teks legacy (warisan data CI/MySQL). */

// Named entity yang umum muncul di data Agronow.
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  hellip: "…", mdash: "—", ndash: "–", middot: "·",
  laquo: "«", raquo: "»", deg: "°", copy: "©", reg: "®",
};

function decodeOnce(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED[name] ?? NAMED[(name as string).toLowerCase()] ?? m);
}

/** Decode entity berulang (sebagian data ter-encode ganda, mis. `&amp;amp;nbsp;`). */
export function decodeEntities(s: string): string {
  let prev = s;
  for (let i = 0; i < 5; i++) {
    const out = decodeOnce(prev);
    if (out === prev) break;
    prev = out;
  }
  return prev;
}

/** Hasilkan teks polos: decode entity dulu, ubah <br> jadi spasi, lalu strip semua tag. */
export function clean(s: string | null | undefined): string {
  if (!s) return "";
  let out = decodeEntities(s); // ungkap entity (termasuk tag yang ter-encode spt &lt;br&gt;)
  out = out.replace(/<br\s*\/?>/gi, " "); // <br> → spasi
  out = out.replace(/<[^>]*>/g, " "); // strip tag tersisa
  out = decodeEntities(out); // jaga-jaga ada entity yang sempat tersembunyi di dalam tag
  return out.replace(/\s+/g, " ").trim();
}

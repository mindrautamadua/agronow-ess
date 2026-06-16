import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agronow — Learning & Development",
    short_name: "Agronow",
    description: "Platform pembelajaran & pengembangan karyawan Perkebunan Nusantara dengan kerangka 70 · 20 · 10.",
    id: "/",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "id",
    dir: "ltr",
    categories: ["education", "productivity", "business"],
    background_color: "#19191B",
    theme_color: "#0c3310",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

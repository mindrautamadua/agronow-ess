/**
 * Proxy (pengganti middleware di Next 16) — gerbang autentikasi optimistik.
 *
 * Hanya mengecek KEBERADAAN cookie sesi, bukan validitasnya (sesuai anjuran:
 * proxy bukan tempat session management penuh). Validasi tanda tangan & masa
 * berlaku terjadi di server (`getSession()` saat route/page dirender).
 *
 *  - Belum ada cookie  → akses halaman terproteksi dialihkan ke `/login`.
 *  - Sudah ada cookie  → akses `/login` dialihkan ke `/home`.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan di semua rute kecuali API, aset Next, file statis, dan gambar.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|.*\\.).*)"],
};

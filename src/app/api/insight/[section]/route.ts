import { getWebinars, getMovies, getDireksi, getQuotes, getBerita, getArticle, getLibrary, getLibraryCategories, getDiskusi, getDiskusiReplies, getChatrooms, getChatMessages } from "@/lib/insight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

/** Data satu section Insight Hub, paginated lewat ?offset=. */
export async function GET(req: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const sp = new URL(req.url).searchParams;
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const q = sp.get("q") || "";

  try {
    switch (section) {
      case "webinar":
        return Response.json({ kind: "video", ...(await getWebinars(PAGE_SIZE, offset, q)) });
      case "short-movie":
        return Response.json({ kind: "video", ...(await getMovies("short", PAGE_SIZE, offset, q)) });
      case "vlog":
        return Response.json({ kind: "video", ...(await getMovies("vlog", PAGE_SIZE, offset, q)) });
      case "direksi":
        return Response.json({ kind: "direksi", ...(await getDireksi(PAGE_SIZE, offset, q)) });
      case "berita":
        return Response.json({ kind: "berita", ...(await getBerita(PAGE_SIZE, offset, q)) });
      case "article":
        return Response.json({ kind: "article", ...(await getArticle(PAGE_SIZE, offset, q)) });
      case "library": {
        const category = sp.get("category") || "all";
        const [data, categories] = await Promise.all([getLibrary(category, PAGE_SIZE, offset, q), getLibraryCategories()]);
        return Response.json({ kind: "library", ...data, categories });
      }
      case "inspirasi":
        return Response.json({ kind: "quotes", ...(await getQuotes(PAGE_SIZE, offset, q)) });
      case "diskusi": {
        const thread = sp.get("thread");
        if (thread) return Response.json({ kind: "diskusi-replies", items: await getDiskusiReplies(Number(thread)) });
        return Response.json({ kind: "discussion", ...(await getDiskusi(PAGE_SIZE, offset, q)) });
      }
      case "chatroom": {
        const room = sp.get("room");
        if (room) {
          const after = Math.max(0, Number(sp.get("after") ?? 0) || 0);
          return Response.json({ kind: "chat-messages", items: await getChatMessages(Number(room), after) });
        }
        return Response.json({ kind: "chatroom", ...(await getChatrooms(PAGE_SIZE, offset, q)) });
      }
      default:
        return Response.json({ kind: "soon", items: [], total: 0 });
    }
  } catch (e) {
    console.error(`/api/insight/${section}`, e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

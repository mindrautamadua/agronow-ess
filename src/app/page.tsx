import { redirect } from "next/navigation";

// Situs asli: /home → /login. Root diarahkan ke halaman login.
export default function Home() {
  redirect("/login");
}

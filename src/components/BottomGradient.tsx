/**
 * Degradasi hijau Agronow — replika `.fixed-bottom-div` dari agronow.co.id:
 * fixed 400px di dasar viewport, di belakang konten (butuh `relative isolate`
 * pada root halaman agar `-z-10` tetap di atas background root namun di bawah konten).
 */
export default function BottomGradient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[400px]"
      style={{ backgroundImage: "linear-gradient(to top, #2E7409, #19191B)" }}
    />
  );
}

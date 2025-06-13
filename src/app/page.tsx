import Link from "next/link";
import PaperTracker from "~/comps/research-tracker";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center ">
      <PaperTracker />
    </main>
  );
}

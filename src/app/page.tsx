import { GameBoard } from "@/components/GameBoard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <GameBoard />
    </main>
  );
}

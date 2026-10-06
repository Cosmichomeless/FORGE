import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-pop"><Hammer className="size-7" /></span>
      <h1 className="text-5xl font-semibold tracking-tight">FORGE</h1>
      <p className="text-lg text-muted-foreground">Your workspace starts here.</p>
      <Button asChild size="lg"><Link href="/register">Create an account<ArrowRight aria-hidden="true" /></Link></Button>
    </div>
  );
}

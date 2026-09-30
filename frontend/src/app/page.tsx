"use client";

import { DemoForm } from "@/components/demo-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-semibold">FORGE</h1>
      <section className="w-full max-w-sm space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Library check</h2>
        <DemoForm onSubmit={() => {}} />
      </section>
    </main>
  );
}

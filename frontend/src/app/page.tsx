import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-semibold">FORGE</h1>
      <p>Your workspace starts here.</p>
      <Link href="/register" className="underline">Create an account</Link>
    </main>
  );
}

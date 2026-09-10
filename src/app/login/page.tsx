"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { useApp } from "@/lib/app-context";

export default function LoginPage() {
  const { login, user } = useApp();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,229,161,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(241,229,161,0.08),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <div>
          <div className="mb-8 flex items-center justify-between lg:justify-start lg:gap-4">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#8a7310] dark:text-[#F1E5A1]">iTAG-PROP</p>
            <ThemeToggle />
          </div>
          <h1 className="font-display text-5xl leading-[0.92] sm:text-7xl">
            Inventory tracking
            <span className="block text-[#8a7310] dark:text-[#F1E5A1]">without losing history.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm text-[var(--text-muted)]">
            Encode school properties, generate QR labels and Excel files, then assign and transfer while keeping every custodian on record.
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate className="surface p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Sign in</p>
          <h2 className="font-display mt-2 text-3xl">Enter the system</h2>
          <div className="mt-6 space-y-4">
            <Field label="DepEd email">
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password" hint="Custodian passwords are 9 digits.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </div>
          <p className="mt-6 text-xs text-[var(--text-muted)]">
            Property Custodian?{" "}
            <Link href="/register" className="text-[#F1E5A1]">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import { isSchoolHeadHost } from "@/lib/hosts";

export default function LoginPage() {
  const { login, user } = useApp();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolHeadHost, setSchoolHeadHost] = useState(false);

  useEffect(() => {
    setSchoolHeadHost(isSchoolHeadHost(window.location.host));
  }, []);

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
    <div className="relative min-h-screen min-h-dvh overflow-x-clip bg-[#FFFFFF]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(211,211,255,0.55),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,211,0.9),transparent_45%)]" />
      <div className="relative mx-auto grid min-h-screen min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0">
          <div className="mb-6 flex items-center justify-start sm:mb-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#3F3FA3]">iTAG-PROP</p>
          </div>
          <h1 className="font-display break-words text-4xl leading-[1.02] sm:text-6xl lg:text-7xl lg:leading-[0.92]">
            Inventory tracking
            <span className="block text-[#3F3FA3]">without losing history.</span>
          </h1>
          <p className="mt-5 max-w-md break-words text-sm text-[var(--text-muted)] sm:mt-6">
            Encode school properties, generate QR labels and Excel files, then assign and transfer while keeping every custodian on record.
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate className="surface w-full p-5 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Sign in</p>
          <h2 className="font-display mt-2 break-words text-2xl sm:text-3xl">Enter the system</h2>
          <div className="mt-6 space-y-4">
            <Field label="DepEd email">
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password" hint="Passwords are 9 digits.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error ? <p className="break-words text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </div>
          <p className="mt-6 break-words text-xs text-[var(--text-muted)]">
            {schoolHeadHost ? "School Head? " : "Property Custodian? "}
            <Link href="/register" className="font-medium text-[#3F3FA3] underline-offset-4 hover:bg-[#FFFFD3] hover:text-[#1a1a1e] hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

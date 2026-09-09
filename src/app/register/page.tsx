"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { ThemeToggle } from "@/components/theme-toggle";
import { useApp } from "@/lib/app-context";
import { isNineDigitPassword } from "@/lib/utils";

export default function RegisterPage() {
  const { register } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationValue>({
    regionId: "",
    provinceId: "",
    municipalityId: "",
    districtId: "",
    schoolId: "",
  });
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "This field is required.";
    if (!form.lastName.trim()) next.lastName = "This field is required.";
    if (!form.email.trim()) next.email = "This field is required.";
    if (!location.regionId) next.regionId = "This field is required.";
    if (!location.provinceId) next.provinceId = "This field is required.";
    if (!location.municipalityId) next.municipalityId = "This field is required.";
    if (!location.districtId) next.districtId = "This field is required.";
    if (!location.schoolId) next.schoolId = "This field is required.";
    if (!isNineDigitPassword(form.password)) {
      next.password = "Password must be exactly 9 digits. Numbers only.";
    }
    if (form.password !== form.confirm) next.confirm = "Password confirmation does not match.";
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("Please complete the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, ...location });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/login" className="text-[11px] uppercase tracking-[0.18em] text-[#8a7310] dark:text-[#F1E5A1]">
            Back to sign in
          </Link>
          <ThemeToggle />
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7310] dark:text-[#F1E5A1]">Property Custodian</p>
        <h1 className="font-display mt-2 text-5xl">Create account</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Registration uses cascading location selection: Region → Province → Municipality → Direction/District → School.
        </p>
        <form onSubmit={onSubmit} noValidate className="surface mt-8 space-y-8 p-6">
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Personal information</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="First name" error={fieldErrors.firstName}>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Middle name">
                <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
              </Field>
              <Field label="Last name" error={fieldErrors.lastName}>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Account information</h2>
            <Field label="DepEd email" error={fieldErrors.email}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Password" hint="Exactly 9 digits. Numbers only." error={fieldErrors.password}>
                <Input type="password" inputMode="numeric" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Confirm password" error={fieldErrors.confirm}>
                <Input type="password" inputMode="numeric" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </Field>
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="font-display text-2xl">School information</h2>
            <LocationFields value={location} onChange={setLocation} errors={fieldErrors} />
          </section>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" loading={loading}>
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}

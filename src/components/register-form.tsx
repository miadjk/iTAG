"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { isNineDigitPassword } from "@/lib/utils";

export function RegisterForm({ schoolHead }: { schoolHead: boolean }) {
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
      const res = await fetch(schoolHead ? "/api/register/school-head" : "/api/register/custodian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...location }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to register.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#FFFFFF] px-4 py-8 text-[var(--text)] sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-start">
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-2 text-[11px] uppercase tracking-[0.18em] text-[#5e2fb0] hover:bg-[#FDF4D2] hover:text-[#9564DD]">
            Back to sign in
          </Link>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5e2fb0]">
          {schoolHead ? "School Head" : "Property Custodian"}
        </p>
        <h1 className="font-display mt-2 break-words text-4xl sm:text-5xl">Create account</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {schoolHead
            ? "School Head registration is separate from Property Custodian accounts. Choose the school you will oversee."
            : "Registration uses cascading location selection: Region → Province → Municipality → Direction/District → School."}
        </p>
        <form onSubmit={onSubmit} noValidate className="surface mt-6 space-y-6 p-5 sm:mt-8 sm:space-y-8 sm:p-6">
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

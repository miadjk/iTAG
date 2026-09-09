"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { useApp } from "@/lib/app-context";
import { isNineDigitPassword } from "@/lib/utils";
import { getSchoolName, locationFromSchool, locationLabel } from "@/lib/locations";

function ProfileForm() {
  const search = useSearchParams();
  const setup = search.get("setup") === "1";
  const { user, updateProfile } = useApp();
  const [editing, setEditing] = useState(setup || !user?.schoolId);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    middleName: user?.middleName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
  });
  const [location, setLocation] = useState<LocationValue>({
    regionId: user?.regionId ?? "",
    provinceId: user?.provinceId ?? "",
    municipalityId: user?.municipalityId ?? "",
    districtId: user?.districtId ?? "",
    schoolId: user?.schoolId ?? "",
  });

  function hydrateFromUser() {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
    });
    const derived = locationFromSchool(user.schoolId);
    setLocation({
      regionId: derived?.regionId || user.regionId || "",
      provinceId: derived?.provinceId || user.provinceId || "",
      municipalityId: derived?.municipalityId || user.municipalityId || "",
      districtId: derived?.districtId || user.districtId || "",
      schoolId: user.schoolId || "",
    });
  }

  useEffect(() => {
    if (user && editing) hydrateFromUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, user?.id, user?.schoolId, user?.updatedAt]);

  useEffect(() => {
    if (!user || editing) return;
    hydrateFromUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.updatedAt, user?.schoolId, user?.schoolName, user?.districtId, editing]);

  if (!user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "This field is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "This field is required.";
    if (!form.email.trim()) nextErrors.email = "This field is required.";
    if (!location.regionId) nextErrors.regionId = "This field is required.";
    if (!location.provinceId) nextErrors.provinceId = "This field is required.";
    if (!location.municipalityId) nextErrors.municipalityId = "This field is required.";
    if (!location.districtId) nextErrors.districtId = "This field is required.";
    if (!location.schoolId) nextErrors.schoolId = "This field is required.";
    if (password && !isNineDigitPassword(password)) nextErrors.password = "Password must be exactly 9 digits.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError("Please complete the highlighted fields.");
      return;
    }
    try {
      await updateProfile({
        ...form,
        ...location,
        schoolName: getSchoolName(location.schoolId),
        password: password || undefined,
      });
      setPassword("");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    }
  }

  const schoolDisplay = getSchoolName(user.schoolId) || user.schoolName || "Not set";

  return (
    <div>
      <PageHeader
        kicker="Account"
        title={setup ? "Complete School Head setup" : "Profile"}
        description="Changing a profile does not erase previous activities."
        actions={
          !editing ? (
            <Button
              type="button"
              onClick={() => {
                hydrateFromUser();
                setEditing(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit profile
            </Button>
          ) : null
        }
      />

      {!editing ? (
        <section className="surface grid gap-4 p-5 sm:grid-cols-2">
          <Meta label="Name" value={`${user.firstName} ${user.middleName} ${user.lastName}`.replace(/\s+/g, " ")} />
          <Meta label="DepEd email" value={user.email} />
          <Meta label="Role" value={user.role === "school_head" ? "School Head" : "Property Custodian"} />
          <Meta label="School" value={schoolDisplay} />
          <div className="sm:col-span-2">
            <Meta label="Location" value={locationLabel(user) || "—"} />
          </div>
        </section>
      ) : (
        <form onSubmit={onSubmit} noValidate className="surface space-y-6 p-5">
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
          <Field label="DepEd email" error={fieldErrors.email}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="New password" hint="Exactly 9 digits. Leave blank to keep the current password." error={fieldErrors.password}>
            <Input type="password" inputMode="numeric" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <section>
            <h2 className="font-display mb-4 text-2xl">School information</h2>
            <LocationFields value={location} onChange={setLocation} errors={fieldErrors} />
          </section>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save / update</Button>
            {!setup && user.schoolId ? (
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{value || "—"}</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">Loading profile…</p>}>
      <ProfileForm />
    </Suspense>
  );
}

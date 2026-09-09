"use client";

import { districts, municipalities, provinces, regions, schools } from "@/lib/locations";
import { Field, Select } from "@/components/ui/field";

export type LocationValue = {
  regionId: string;
  provinceId: string;
  municipalityId: string;
  districtId: string;
  schoolId: string;
};

export function LocationFields({
  value,
  onChange,
  errors,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  errors?: Partial<Record<keyof LocationValue, string>>;
}) {
  const provinceOptions = provinces.filter((p) => p.regionId === value.regionId);
  const municipalityOptions = municipalities.filter((m) => m.provinceId === value.provinceId);
  const districtOptions = districts.filter((d) => d.municipalityId === value.municipalityId);
  const schoolOptions = schools.filter((s) => s.districtId === value.districtId);
  const schoolValid = !value.schoolId || schoolOptions.some((s) => s.id === value.schoolId);

  function update(partial: Partial<LocationValue>) {
    const next = { ...value, ...partial };
    if ("regionId" in partial) {
      next.provinceId = "";
      next.municipalityId = "";
      next.districtId = "";
      next.schoolId = "";
    } else if ("provinceId" in partial) {
      next.municipalityId = "";
      next.districtId = "";
      next.schoolId = "";
    } else if ("municipalityId" in partial) {
      next.districtId = "";
      next.schoolId = "";
    } else if ("districtId" in partial) {
      next.schoolId = "";
    }
    onChange(next);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Region" error={errors?.regionId}>
        <Select value={value.regionId} onChange={(e) => update({ regionId: e.target.value })}>
          <option value="">Select region</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Province" error={errors?.provinceId}>
        <Select value={value.provinceId} onChange={(e) => update({ provinceId: e.target.value })} disabled={!value.regionId}>
          <option value="">Select province</option>
          {provinceOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Municipality" error={errors?.municipalityId}>
        <Select
          value={value.municipalityId}
          onChange={(e) => update({ municipalityId: e.target.value })}
          disabled={!value.provinceId}
        >
          <option value="">Select municipality</option>
          {municipalityOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        {value.provinceId && municipalityOptions.length === 0 ? (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Municipality options are Lupon and Banaybanay. Select Davao Oriental to continue.
          </p>
        ) : null}
      </Field>
      <Field label="Direction / District" error={errors?.districtId}>
        <Select
          key={`district-${value.municipalityId}`}
          value={value.districtId}
          onChange={(e) => update({ districtId: e.target.value })}
          disabled={!value.municipalityId}
        >
          <option value="">Select district</option>
          {districtOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="School" error={errors?.schoolId}>
        <Select
          key={`school-${value.districtId}`}
          value={schoolValid ? value.schoolId : ""}
          onChange={(e) => update({ schoolId: e.target.value })}
          disabled={!value.districtId}
        >
          <option value="">Select school</option>
          {schoolOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Role } from "@/types";

export type RegisterAccountInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  regionId: string;
  provinceId: string;
  municipalityId: string;
  districtId: string;
  schoolId: string;
};

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function upsertProfile(
  admin: SupabaseClient,
  userId: string,
  input: RegisterAccountInput,
  role: Role,
) {
  const row = {
    id: userId,
    first_name: input.firstName.trim(),
    middle_name: input.middleName?.trim() ?? "",
    last_name: input.lastName.trim(),
    email: input.email.trim(),
    role,
    school_id: input.schoolId,
    region_id: input.regionId || null,
    province_id: input.provinceId || null,
    municipality_id: input.municipalityId || null,
    district_id: input.districtId || null,
    active: true,
    must_update_credentials: false,
  };
  const saved = await admin.from("profiles").upsert(row, { onConflict: "id" });
  if (saved.error) throw new Error(saved.error.message);
}

export async function createOrRestoreAccount(
  admin: SupabaseClient,
  input: RegisterAccountInput,
  role: Role,
) {
  const email = input.email.trim();
  const metadata = {
    first_name: input.firstName.trim(),
    middle_name: input.middleName?.trim() ?? "",
    last_name: input.lastName.trim(),
    role,
    school_id: input.schoolId,
    region_id: input.regionId ?? "",
    province_id: input.provinceId ?? "",
    municipality_id: input.municipalityId ?? "",
    district_id: input.districtId ?? "",
    created_by_admin: "true",
  };

  const existingAuth = await findAuthUserByEmail(admin, email);
  if (existingAuth) {
    const profile = await admin.from("profiles").select("id, active").eq("id", existingAuth.id).maybeSingle();
    if (profile.data?.active) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    const updated = await admin.auth.admin.updateUserById(existingAuth.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updated.error) throw new Error(updated.error.message);
    await upsertProfile(admin, existingAuth.id, input, role);
    return existingAuth.id;
  }

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created.error) {
    const message = created.error.message || "";
    if (/already/i.test(message) || /registered/i.test(message)) {
      const again = await findAuthUserByEmail(admin, email);
      if (again) {
        await admin.auth.admin.updateUserById(again.id, {
          password: input.password,
          email_confirm: true,
          user_metadata: metadata,
        });
        await upsertProfile(admin, again.id, input, role);
        return again.id;
      }
    }
    throw new Error(created.error.message);
  }
  if (created.data.user?.id) {
    await upsertProfile(admin, created.data.user.id, input, role);
  }
  return created.data.user?.id;
}

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSchoolHeadHost } from "@/lib/hosts";
import { isNineDigitPassword } from "@/lib/utils";

type Body = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  regionId?: string;
  provinceId?: string;
  municipalityId?: string;
  districtId?: string;
  schoolId?: string;
};

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!isSchoolHeadHost(host)) {
    return NextResponse.json({ error: "School Head registration is only available on the School Head site." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.email || !body.password || !body.firstName || !body.lastName || !body.schoolId) {
    return NextResponse.json({ error: "Complete the required account fields." }, { status: 400 });
  }
  if (!isNineDigitPassword(body.password)) {
    return NextResponse.json({ error: "Password must be exactly 9 digits." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const existing = await admin
    .from("profiles")
    .select("id")
    .eq("school_id", body.schoolId)
    .eq("role", "school_head")
    .eq("active", true)
    .maybeSingle();
  if (existing.data) {
    return NextResponse.json({ error: "This school already has a School Head." }, { status: 409 });
  }

  const created = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
    user_metadata: {
      first_name: body.firstName.trim(),
      middle_name: body.middleName?.trim() ?? "",
      last_name: body.lastName.trim(),
      role: "school_head",
      school_id: body.schoolId,
      region_id: body.regionId ?? "",
      province_id: body.provinceId ?? "",
      municipality_id: body.municipalityId ?? "",
      district_id: body.districtId ?? "",
      created_by_admin: "true",
    },
  });

  if (created.error) {
    return NextResponse.json({ error: created.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

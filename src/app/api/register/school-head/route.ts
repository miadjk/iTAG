import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSchoolHeadHost } from "@/lib/hosts";
import { isNineDigitPassword } from "@/lib/utils";
import { createOrRestoreAccount, type RegisterAccountInput } from "@/lib/register-account";

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!isSchoolHeadHost(host)) {
    return NextResponse.json({ error: "School Head registration is only available on the School Head site." }, { status: 403 });
  }

  let body: Partial<RegisterAccountInput>;
  try {
    body = (await request.json()) as Partial<RegisterAccountInput>;
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

  try {
    await createOrRestoreAccount(
      admin,
      {
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        email: body.email,
        password: body.password,
        regionId: body.regionId ?? "",
        provinceId: body.provinceId ?? "",
        municipalityId: body.municipalityId ?? "",
        districtId: body.districtId ?? "",
        schoolId: body.schoolId,
      },
      "school_head",
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to register." }, { status: 400 });
  }
}

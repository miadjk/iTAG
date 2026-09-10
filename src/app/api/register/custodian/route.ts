import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSchoolHeadHost } from "@/lib/hosts";
import { isNineDigitPassword } from "@/lib/utils";
import { createOrRestoreAccount, type RegisterAccountInput } from "@/lib/register-account";

function parseBody(body: Partial<RegisterAccountInput>) {
  if (!body.email || !body.password || !body.firstName || !body.lastName || !body.schoolId) {
    return { error: "Complete the required account fields." };
  }
  if (!isNineDigitPassword(body.password)) {
    return { error: "Password must be exactly 9 digits." };
  }
  return {
    input: {
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
    } satisfies RegisterAccountInput,
  };
}

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (isSchoolHeadHost(host)) {
    return NextResponse.json({ error: "Use the School Head site to register as School Head." }, { status: 403 });
  }

  let raw: Partial<RegisterAccountInput>;
  try {
    raw = (await request.json()) as Partial<RegisterAccountInput>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if ("error" in parsed && parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    await createOrRestoreAccount(admin, parsed.input!, "property_custodian");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to register." }, { status: 400 });
  }
}

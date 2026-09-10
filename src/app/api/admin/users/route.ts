import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNineDigitPassword } from "@/lib/utils";

type Body = {
  action: "createCustodian" | "replaceSchoolHead" | "setActive";
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
  userId?: string;
  active?: boolean;
};

async function requireHead() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };

  const profile = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data || profile.data.role !== "school_head" || !profile.data.active) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { supabase, user, profile: profile.data };
}

export async function POST(request: Request) {
  const gate = await requireHead();
  if ("error" in gate && gate.error) return gate.error;
  const head = gate.profile;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action === "setActive") {
    if (!body.userId || typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Missing user." }, { status: 400 });
    }
    if (body.userId === head.id) {
      return NextResponse.json({ error: "You cannot deactivate your own School Head account." }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const target = await admin.from("profiles").select("*").eq("id", body.userId).maybeSingle();
    if (!target.data || target.data.school_id !== head.school_id) {
      return NextResponse.json({ error: "User not found in this school." }, { status: 404 });
    }
    if (target.data.role !== "property_custodian") {
      return NextResponse.json({ error: "Only Property Custodian accounts can be activated or deactivated here." }, { status: 400 });
    }
    const updated = await admin.from("profiles").update({ active: body.active }).eq("id", body.userId);
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (!body.email || !body.password || !body.firstName || !body.lastName || !body.schoolId) {
    return NextResponse.json({ error: "Complete the required account fields." }, { status: 400 });
  }
  if (head.school_id && body.schoolId !== head.school_id) {
    return NextResponse.json({ error: "School Head can only create accounts for their school." }, { status: 403 });
  }
  if (!isNineDigitPassword(body.password)) {
    return NextResponse.json({ error: "Password must be exactly 9 digits." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const role = body.action === "replaceSchoolHead" ? "school_head" : "property_custodian";

  if (role === "school_head" && head.school_id) {
    await admin
      .from("profiles")
      .update({ active: false, role: "property_custodian" })
      .eq("school_id", head.school_id)
      .eq("role", "school_head")
      .eq("active", true);
  }

  const created = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
    user_metadata: {
      first_name: body.firstName.trim(),
      middle_name: body.middleName?.trim() ?? "",
      last_name: body.lastName.trim(),
      role,
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

  return NextResponse.json({ ok: true, id: created.data.user?.id });
}

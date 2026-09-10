import { headers } from "next/headers";
import { isSchoolHeadHost } from "@/lib/hosts";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  return <RegisterForm schoolHead={isSchoolHeadHost(host)} />;
}

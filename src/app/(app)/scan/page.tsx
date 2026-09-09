import { redirect } from "next/navigation";

export default function ScanRedirect() {
  redirect("/properties?scan=1");
}

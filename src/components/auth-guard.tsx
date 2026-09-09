"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.mustUpdateCredentials && pathname !== "/profile") {
      router.replace("/profile?setup=1");
    }
  }, [ready, user, router, pathname]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-muted)]">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}

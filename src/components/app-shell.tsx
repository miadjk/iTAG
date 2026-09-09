"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  User,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { displayName } from "@/lib/utils";
import { clsx } from "@/lib/clsx";
import { getSchoolName } from "@/lib/locations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, unreadNotifications, markNotificationRead, markAllNotificationsRead, state } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const items = useMemo(() => {
    if (!user) return [];
    if (user.role === "school_head") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/properties", label: "Properties", icon: Package },
        { href: "/supplies", label: "Supplies", icon: Warehouse },
        { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
        { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
        { href: "/reports", label: "Reports", icon: FileText },
        { href: "/users", label: "Users / Custodians", icon: Users },
        { href: "/audit", label: "Activity", icon: ScrollText },
        { href: "/profile", label: "Profile", icon: User },
      ];
    }
    return [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/properties", label: "My Properties", icon: Package },
      { href: "/properties/new", label: "Add Property", icon: Package },
      { href: "/supplies", label: "Supplies", icon: Warehouse },
      { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
      { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/audit", label: "Activity", icon: ScrollText },
      { href: "/profile", label: "Profile", icon: User },
    ];
  }, [user]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) return null;

  const notes = state.notifications.filter((n) => n.userId === user.id).slice(0, 12);
  const schoolName = getSchoolName(user.schoolId) || user.schoolName || "";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-[var(--border)] px-5 py-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#b79f2e] dark:text-[#F1E5A1]">iTAG-PROP</p>
          <h1 className="font-display mt-2 text-3xl leading-none text-[var(--sidebar-text)]">Inventory</h1>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href) && item.href !== "/properties/new" && !(item.href === "/properties" && pathname === "/properties/new"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={clsx(
                  "mb-1 flex items-center gap-3 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] transition",
                  active ? "bg-[#F1E5A1] text-black" : "text-[var(--sidebar-muted)] hover:text-[#F1E5A1]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-4">
          <p className="truncate text-xs text-[var(--sidebar-text)]">{displayName(user)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--sidebar-muted)]">
            {user.role === "school_head" ? "School Head" : "Property Custodian"}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--sidebar-muted)] hover:text-[#F1E5A1]"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {open ? (
        <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />
      ) : null}

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {schoolName || "Complete school profile to bind inventory"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className="relative inline-flex h-10 w-10 items-center justify-center border border-[var(--border)]"
                onClick={() => setNotesOpen((v) => !v)}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F1E5A1]" />
                ) : null}
              </button>
              {notesOpen ? (
                <div className="absolute right-0 top-12 z-30 w-[min(92vw,360px)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-widest">Notifications</p>
                    <button type="button" className="text-[10px] uppercase text-[#F1E5A1]" onClick={markAllNotificationsRead}>
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="p-4 text-xs text-[var(--text-muted)]">No notifications yet.</p>
                    ) : (
                      notes.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className="block w-full border border-[var(--border)] p-3 text-left"
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.href) router.push(n.href);
                            setNotesOpen(false);
                          }}
                        >
                          <p className="text-xs">{n.title}</p>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{n.body}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

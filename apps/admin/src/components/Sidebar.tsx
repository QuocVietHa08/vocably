"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const navItems = [
  { href: "/",              label: "Dashboard",         icon: "⬛" },
  { href: "/users",         label: "Users",             icon: "👥" },
  { href: "/flashcards",    label: "Flashcards & Words", icon: "🗂️" },
  { href: "/conversations", label: "Conversations",     icon: "💬" },
  { href: "/sessions",      label: "Practice Sessions", icon: "⏱️" },
  { href: "/tokens",        label: "Token Usage",       icon: "🔋" },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col w-60 min-h-screen shrink-0"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
          style={{ background: "var(--sidebar-accent)" }}
        >
          🎓
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--sidebar-text-active)" }}>
            IELTS Admin
          </p>
          <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>
            Management Panel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        <p
          className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
          style={{ color: "var(--sidebar-text)" }}
        >
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background:  isActive ? "rgba(99,102,241,0.15)" : "transparent",
                color:       isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                borderLeft:  isActive ? "2px solid var(--sidebar-accent)" : "2px solid transparent",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Signed-in user + sign out */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {userEmail && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ background: "var(--sidebar-accent)" }}
            >
              {userEmail[0].toUpperCase()}
            </div>
            <p className="text-xs truncate" style={{ color: "var(--sidebar-text)" }}>
              {userEmail}
            </p>
          </div>
        )}
        <button
          onClick={signOut}
          className="w-full text-xs py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ background: "#ef444420", color: "#ef4444" }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

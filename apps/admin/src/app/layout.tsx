import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "IELTS Admin Panel",
  description: "Manage users, flashcards, sessions and token usage",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current admin user for sidebar display (safe — middleware already verified admin)
  let userEmail: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? undefined;
  } catch {
    // Not authenticated yet (login page) — sidebar will be hidden
  }

  const isLoginPage = typeof window === "undefined" && !userEmail;

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="flex min-h-screen" style={{ background: "var(--content-bg)" }}>
          {userEmail && <Sidebar userEmail={userEmail} />}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

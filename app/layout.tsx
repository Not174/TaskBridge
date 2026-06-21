import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth/jose";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskBridge — Bangladeshi Gig Work Platform",
  description: "Connecting Task Posters and Task Seekers across Bangladesh securely and quickly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("tb_access_token")?.value;
  let user = null;

  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      user = {
        id: payload.id as string,
        phone: payload.phone as string,
        role: payload.role as 'POSTER' | 'SEEKER' | 'ADMIN',
        name: (payload.name as string) || undefined,
      };
    }
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <Navbar user={user} />
        <main className="flex-grow flex flex-col">{children}</main>
        <footer className="bg-primary text-slate-400 py-6 border-t border-white/10 text-center text-xs">
          <div className="max-w-7xl mx-auto px-4">
            <p>© {new Date().getFullYear()} TaskBridge. All rights reserved.</p>
            <p className="mt-1 text-slate-500">Connecting Bangladeshi Gig Workers & Clients</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

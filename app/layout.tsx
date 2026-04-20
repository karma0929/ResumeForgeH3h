import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { getLaunchBlockers } from "@/lib/env";
import { getUiLanguage } from "@/lib/i18n-server";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumeForge",
  description: "AI-powered resume optimization SaaS for U.S. job seekers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const launchBlockers = getLaunchBlockers();
  const uiLanguage = await getUiLanguage();

  return (
    <html
      lang={uiLanguage}
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        {launchBlockers.length > 0 ? (
          <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
            <div className="max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Launch blocked</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                ResumeForge is missing required production configuration.
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Add the missing environment variables below in your production deployment and redeploy before sending traffic to this app.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-200">
                {launchBlockers.map((name) => (
                  <li key={name}>- {name}</li>
                ))}
              </ul>
            </div>
          </main>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk } from "next/font/google";
import "./globals.css";

// latin-ext carries the currency block (₵ ₦ ₹ …); weights limited to 400/500/600 per the type rules.
const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Votex", template: "%s · Votex" },
  description: "Paid voting, elections and tickets for events.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={familjen.variable}>
      <body>{children}</body>
    </html>
  );
}

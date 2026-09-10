import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Capivara Beer — Bebida gelada na sua toca",
  description: "Cervejas, refrigerantes, energéticos, gelo e petiscos com opção de entrega ou retirada.",
  openGraph: {
    title: "Capivara Beer",
    description: "Bebida gelada na sua toca.",
    images: [{ url: "/capivara-beer-social.webp", width: 1200, height: 630, alt: "Capivara Beer — Bebida gelada na sua toca" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capivara Beer",
    description: "Bebida gelada na sua toca.",
    images: ["/capivara-beer-social.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}

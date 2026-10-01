import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./reader.css";

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Estúdio Teológico", template: "%s · Estúdio Teológico" },
  description: "Estudo pessoal de teologia: Bíblia, notas, marcadores e revisão.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

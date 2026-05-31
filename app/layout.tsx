import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WITE — Générateur de visuels",
  description: "Générateur d'images produit interne — WITE Ceintures",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

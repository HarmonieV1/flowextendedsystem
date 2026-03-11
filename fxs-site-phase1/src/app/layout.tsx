import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FXS | Flow Extended System",
  description:
    "FXS enrichit tous tes graphiques avec des insights avancés et t’envoie des signaux filtrés en temps réel.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "FXS | Flow Extended System",
    description:
      "FXS enrichit tous tes graphiques avec des insights avancés et t’envoie des signaux filtrés en temps réel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="bg-[#0b0d0c] text-white antialiased">
        {children}
      </body>
    </html>
  );
}

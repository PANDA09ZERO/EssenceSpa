import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/layout/SupabaseProvider";

export const metadata: Metadata = {
  title: "Essence Spa - Sistema de Gestión",
  description: "Sistema de gestión para salón de uñas Essence Spa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-body">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}

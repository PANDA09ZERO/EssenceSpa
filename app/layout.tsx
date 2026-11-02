import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/layout/SupabaseProvider";

export const metadata: Metadata = {
  title: "Essence Spa - Sistema de Gestión",
  description: "Sistema de gestión para salón de uñas Essence Spa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

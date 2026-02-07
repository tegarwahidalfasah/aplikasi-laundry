import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAUNDRY.hub - Management System",
  description: "Sistem Manajemen Laundry Real-time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
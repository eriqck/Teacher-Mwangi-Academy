import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teacher Mwangi Academy",
  description:
    "Membership-based CBE and secondary revision materials for Kenyan parents and teachers with M-Pesa checkout."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

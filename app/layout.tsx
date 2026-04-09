import type { Metadata } from "next";
import { academyName } from "@/lib/business";
import { getSiteUrl } from "@/lib/site-url";
import { SiteFooter } from "@/components/site-footer";
import { SiteWhatsAppButton } from "@/components/site-whatsapp-button";
import "./globals.css";

const siteUrl = getSiteUrl();
const siteDescription =
  "Teacher Mwangi Academy offers CBE revision materials, assessments, notes, and teacher resources for Kenyan parents, learners, and teachers.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: academyName,
    template: `%s | ${academyName}`
  },
  description: siteDescription,
  applicationName: academyName,
  keywords: [
    "Teacher Mwangi Academy",
    "CBE revision materials Kenya",
    "Grade 7 notes",
    "Grade 8 assessments",
    "Grade 9 revision",
    "Grade 10 materials",
    "Form 3 revision",
    "Form 4 revision",
    "schemes of work Kenya"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: academyName,
    title: academyName,
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: academyName,
    description: siteDescription
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.GOOGLE_SITE_VERIFICATION
      }
    : undefined
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteWhatsAppButton />
        <SiteFooter />
      </body>
    </html>
  );
}

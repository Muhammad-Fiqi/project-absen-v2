import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruang PTE | Kursus PTE Academic di Kampung Inggris Pare",
  description: "Ruang PTE adalah pusat persiapan PTE Academic di Kampung Inggris Pare, Kediri, dengan sistem absensi siswa, jadwal kelas, dan dashboard pengajar.",
  keywords: [
    "Ruang PTE",
    "kursus PTE Academic",
    "persiapan PTE Academic",
    "les PTE di Kampung Inggris Pare",
    "kursus bahasa Inggris Pare",
    "absensi siswa PTE",
    "sistem absensi kursus",
    "dashboard pengajar",
    "jadwal kelas PTE",
    "WHV Australia",
    "study abroad",
  ],
  authors: [{ name: "Ruang PTE" }],
  creator: "Ruang PTE",
  publisher: "Ruang PTE",
  category: "education",
  applicationName: "Ruang PTE",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Ruang PTE",
    title: "Ruang PTE | Kursus PTE Academic di Kampung Inggris Pare",
    description: "Pusat persiapan PTE Academic di Kampung Inggris Pare dengan informasi kelas dan sistem absensi siswa yang terintegrasi.",
    images: [{ url: "/logo.png", alt: "Logo Ruang PTE" }],
  },
  twitter: {
    card: "summary",
    title: "Ruang PTE | Kursus PTE Academic Pare",
    description: "Persiapan PTE Academic, kelas bahasa Inggris, dan sistem absensi siswa Ruang PTE di Kampung Inggris Pare.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

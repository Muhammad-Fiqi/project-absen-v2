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
  title: "Ruang PTE",
  description: "Aplikasi absensi Ruang PTE",
  keywords: ["PTE", "attendance", "absensi", "kursus", "siswa", "pengajar", "admin", "ruang pte", "ruangpte", "ruang pte", "ruangpte.com", "ruang pte.com", "kampung inggris", "kampunginggris", "kampung inggris.com", "kampunginggris.com", "kursusan kampung inggris", "kursusankampunginggris", "whv", "study abroad", "studyabroad", "kampung inggris pare", "work abroad", "permanent residence", "whv australia", "whv new zealand", "whv canada"],
  authors: [{ name: "Ruang PTE" }],
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

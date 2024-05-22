import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./_components/Navbar";
import Footer from "./_components/Footer";
import { Toaster } from "@/components/ui/toaster";
import Providers from "./_components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CaseCobra",
  description:
    "Captura tu imgn favotita única para tu carcaza de celular. CaseCobra protege no solo tus memorias, también tu celular.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="flex flex-col min-h-[calc(100vh-3.5rem-1px)]">
          <div className="flex-1 flex flex-col h-full">
            <Providers>{children}</Providers>
          </div>
          <Footer />
        </main>

        <Toaster />
      </body>
    </html>
  );
}

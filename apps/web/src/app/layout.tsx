import "./globals.css";
import { Providers } from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Personal Finance",
  description: "Personal finance application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Providers>
            <Sidebar />
            <main className="flex-1 p-8">{children}</main>
          </Providers>
        </div>
      </body>
    </html>
  );
}

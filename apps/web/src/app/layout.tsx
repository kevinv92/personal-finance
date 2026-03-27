import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata = {
  title: "Personal Finance",
  description: "Personal finance application",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/banks", label: "Banks" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
            <div className="px-4 py-5 border-b border-gray-700">
              <h1 className="text-lg font-semibold tracking-tight">
                Personal Finance
              </h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">
            <Providers>{children}</Providers>
          </main>
        </div>
      </body>
    </html>
  );
}

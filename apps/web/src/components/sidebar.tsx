"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboards } from "@/lib/api";

const navItems = [
  { href: "/", label: "Dashboards" },
  { href: "/banks", label: "Banks" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/imports", label: "Imports" },
];

export function Sidebar() {
  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards"],
    queryFn: getDashboards,
  });

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-semibold tracking-tight">
          Personal Finance
        </h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {item.label}
            </Link>
            {item.href === "/" && dashboards.length > 0 && (
              <div className="ml-3 space-y-0.5">
                {dashboards.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboards/${d.id}`}
                    className="block px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors truncate"
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

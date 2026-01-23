// --- FILE: app/components/Navbar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2 text-xl font-bold tracking-tighter text-white"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-500 transition-transform group-hover:rotate-12">
                <Image
                  src="/images/icon.png"
                  alt="Logo"
                  fill
                  className="object-contain drop-shadow-2xl rounded-full"
                />
              </div>
              PlayChess
            </Link>
          </div>

          {/* desktop links */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            <button className="flex h-10 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25">
              Sign In
            </button>
          </div>

          {/* mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setOpen((s) => !s)}
              aria-label="Toggle menu"
              className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {open ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu items */}
      {open && (
        <div className="border-t border-white/5 bg-[#09090b] px-4 py-4 space-y-2 md:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                  isActive
                    ? "bg-white/5 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

// --- FILE: app/page.js (example)

// --- FILE: globals.css
/* If using Tailwind, import the generated css here (e.g. @tailwind base; etc.) OR add your own CSS */
// @tailwind base;
// @tailwind components;
// @tailwind utilities;

// /* quick fallback styles if not using Tailwind */
// nav { background: #fff; border-bottom: 1px solid #e5e7eb; }
// nav a { color: #374151; text-decoration: none; }
// nav a[aria-current='page'] { color: #2563eb }

/* --- NOTES ---
1) Navbar is a Client Component ('use client') because it uses usePathname() and state.
2) usePathname comes from next/navigation (App Router) and lets you highlight the active link.
3) If you prefer plain CSS instead of Tailwind, replace the utility classes with your own styles in globals.css.
4) To add this navbar to every page, import it in app/layout.js like above.
5) If you want animations or more accessibility tweaks, add focus styles and keyboard handlers.
*/

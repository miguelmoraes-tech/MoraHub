"use client";

import { usePathname } from "next/navigation";

/** Fades route content in on every navigation so switching modes doesn't feel abrupt. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="hub-mode-fade-in">
      {children}
    </div>
  );
}

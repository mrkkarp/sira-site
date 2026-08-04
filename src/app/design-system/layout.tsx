import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "../globals.css";

const interfaceSans = Manrope({
  variable: "--font-interface-sans",
  subsets: ["latin"],
});
/** Cormorant Garamond, not Instrument Serif: the old face had no Cyrillic at
 * all, so Ukrainian headings rendered in the OS fallback. Kept identical to
 * `[locale]/layout.tsx`, which carries the full note — these are independent
 * roots and each must declare the fonts itself. */
const editorialSerif = Cormorant_Garamond({
  variable: "--font-editorial-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Design system — ODUDLAB (dev only)",
  robots: { index: false, follow: false },
};

/** Dev-only tooling — never shipped to production, not part of the localised site. */
export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <html
      lang="en"
      className={`${interfaceSans.variable} ${editorialSerif.variable}`}
    >
      <body className="bg-background text-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Manrope, Instrument_Serif } from "next/font/google";
import "../globals.css";

const interfaceSans = Manrope({
  variable: "--font-interface-sans",
  subsets: ["latin"],
});
const editorialSerif = Instrument_Serif({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
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

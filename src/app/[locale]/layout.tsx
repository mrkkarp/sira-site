import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Header } from "@/components/header/header";
import { Footer } from "@/components/footer";

const interfaceSans = Manrope({
  variable: "--font-interface-sans",
  subsets: ["latin", "cyrillic"],
});

const editorialSerif = Instrument_Serif({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  return {
    title: `${dictionary.site.name} — ${dictionary.site.tagline}`,
    description: dictionary.site.tagline,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${interfaceSans.variable} ${editorialSerif.variable}`}
    >
      <body className="bg-background text-text flex min-h-screen flex-col font-sans antialiased">
        <Header locale={locale} dictionary={dictionary} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}

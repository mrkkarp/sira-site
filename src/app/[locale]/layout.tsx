import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Header } from "@/components/header/header";
import { Footer } from "@/components/footer";
import { ToastProvider } from "@/components/ui/toast";
import { SkipToContent } from "@/components/skip-to-content";
import { NoScriptNav } from "@/components/no-script-nav";
import { RouteProgress } from "@/components/route-progress";
import { PageTransition } from "@/components/page-transition";
import { SmoothWheelScroll } from "@/components/smooth-wheel-scroll";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { getSiteUrl } from "@/lib/site-url";
import { robotsMetadata } from "@/lib/seo/indexing";

const siteUrl = getSiteUrl();

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
    metadataBase: siteUrl,
    title: {
      default: `${dictionary.site.name} — ${dictionary.site.tagline}`,
      template: `%s — ${dictionary.site.name}`,
    },
    description: dictionary.site.tagline,
    // Indexable only on the real production deployment *serving its own
    // domain* — a `*.vercel.app` value in NEXT_PUBLIC_SITE_URL means the
    // cutover has not happened, so nothing is indexable yet. This
    // `<meta robots>` agrees with the authoritative site-wide `X-Robots-Tag`
    // header in next.config.ts; see src/lib/seo/indexing.ts.
    // Individual routes still opt out via their own generateMetadata (e.g.
    // placeholder pages, /search).
    robots: robotsMetadata(locale),
    // Google Search Console "HTML tag" verification. Env-driven so no token is
    // invented here: set `GOOGLE_SITE_VERIFICATION` to the value GSC gives you
    // (see GOOGLE_SEARCH_CONSOLE_SETUP.md) and this emits the required
    // <meta name="google-site-verification"> tag; unset, it emits nothing.
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
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
        <ToastProvider>
          <SmoothWheelScroll />
          <SkipToContent label={dictionary.footerNav.skipToContent} />
          <RouteProgress />
          <NoScriptNav locale={locale} dictionary={dictionary} />
          <Header locale={locale} dictionary={dictionary} />
          {/* Renders <main id="main-content"> itself — see page-transition.tsx.
              `children` stays server-rendered: it is passed as a prop, not
              imported by the client component. */}
          <PageTransition>{children}</PageTransition>
          <Footer locale={locale} dictionary={dictionary} />
          <CookieConsent dictionary={dictionary} />
          <GoogleTagManager />
        </ToastProvider>
      </body>
    </html>
  );
}

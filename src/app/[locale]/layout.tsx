import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
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
import { BackToTop } from "@/components/back-to-top";
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

/**
 * The editorial serif carries every display role — product names, page H1s,
 * section headings — for a catalogue whose primary language is Ukrainian.
 *
 * It was Instrument Serif, loaded `subsets: ["latin"]` because that is the
 * only subset Instrument Serif publishes: the family has no Cyrillic at all.
 * So every Ukrainian heading on the site rendered *half* in it. A CDP
 * `CSS.getPlatformFontsForNode` audit of production said so exactly — the
 * product title "Журнальний столик з бетону Caiman" came back as
 * `Instrument Serif(web)×10, Times New Roman(local)×23`: the Latin model name
 * in the brand face, the Ukrainian words beside it in whatever serif the OS
 * had lying around. Two typefaces inside one heading, and 23 of its 33 glyphs
 * in the one nobody chose.
 *
 * Cormorant Garamond replaces it because it ships a real Cyrillic (drawn with
 * the family, not bolted on), and because of the three Cyrillic-complete
 * candidates it is the narrowest — which matters here and not in the
 * abstract: the product page's info column is ~420 px at the 1024 px
 * breakpoint, and a wider display face pushes long names onto a third line
 * inside a panel that was just made to fit without a scrollbar of its own.
 * Its fine stroke contrast also belongs beside this site's hairline drawing
 * rules in a way a heavy didone would not — it sits in the same weight class
 * as the rest of the page instead of shouting over it.
 *
 * Weights 400 and 500: Cormorant is a small-on-the-body face, so the large
 * display roles take 400 and the smallest serif role (`type-h2`, which is
 * what a product name is) takes 500 to hold its colour. No italic — nothing
 * in the site sets italic on serif text, and shipping the file would be two
 * network requests for zero glyphs.
 */
const editorialSerif = Cormorant_Garamond({
  variable: "--font-editorial-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
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
    // Indexable only on the real production deployment (and only while the
    // SEO_NOINDEX kill-switch is off) — every non-production deploy is
    // noindex. This `<meta robots>` agrees with the authoritative site-wide
    // `X-Robots-Tag` header in next.config.ts; see src/lib/seo/indexing.ts.
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
          <BackToTop label={dictionary.footerNav.backToTop} />
          <CookieConsent dictionary={dictionary} />
          <GoogleTagManager />
        </ToastProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { notFound } from "next/navigation";
import { HeroBoundary } from "@/components/header/hero-boundary";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);

  return (
    <>
      {/* Dark "production mode" hero (BRAND_VISUAL_GUIDE §2.3) — demonstrates
          the transparent-header-over-hero mechanism (see globals.css and
          HeroBoundary). No real photography exists yet (IMAGE_REQUIREMENTS.md),
          so this stands in for a future full-bleed photo hero. */}
      <section
        className="bg-footer text-background"
        style={{
          marginTop: "calc(-1 * var(--header-stack-height))",
          paddingTop: "var(--header-stack-height)",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-(--space-2xl)">
          <p className="type-eyebrow text-background/70">{dictionary.home.heroEyebrow}</p>
          <h1 className="type-display-l max-w-3xl">{dictionary.home.heroTitle}</h1>
          <p className="type-body-lg text-background/80 max-w-xl">
            {dictionary.home.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href={localeHref(locale, "/shop")}
              className="type-nav border-background hover:bg-background hover:text-footer border px-6 py-3 transition-colors duration-(--duration-fast)"
            >
              {dictionary.home.heroCta}
            </Link>
            <Link
              href={localeHref(locale, "/about")}
              className="type-nav text-background/70 hover:text-background px-6 py-3 transition-colors duration-(--duration-fast)"
            >
              {dictionary.home.secondaryCta}
            </Link>
          </div>
        </div>
        <HeroBoundary />
      </section>
    </>
  );
}

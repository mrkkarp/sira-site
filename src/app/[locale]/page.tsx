import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { notFound } from "next/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-(--space-xl)">
      <p className="type-eyebrow text-text-muted">
        {dictionary.home.heroEyebrow}
      </p>
      <h1 className="type-display-l text-text max-w-3xl">
        {dictionary.home.heroTitle}
      </h1>
      <p className="type-body-lg text-text-muted max-w-xl">
        {dictionary.home.heroSubtitle}
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          href={localeHref(locale, "/shop")}
          className="type-nav border-text text-text hover:bg-text hover:text-background border px-6 py-3 transition-colors duration-(--duration-fast)"
        >
          {dictionary.home.heroCta}
        </Link>
        <Link
          href={localeHref(locale, "/about")}
          className="type-nav text-text-muted hover:text-text px-6 py-3 transition-colors duration-(--duration-fast)"
        >
          {dictionary.home.secondaryCta}
        </Link>
      </div>
    </section>
  );
}

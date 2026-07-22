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
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-28">
      <p className="text-ink-muted text-xs tracking-wide uppercase">
        {dictionary.home.heroEyebrow}
      </p>
      <h1 className="text-ink max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">
        {dictionary.home.heroTitle}
      </h1>
      <p className="text-ink-muted max-w-xl text-base">
        {dictionary.home.heroSubtitle}
      </p>
      <div className="flex flex-wrap gap-4 pt-2 text-sm">
        <Link
          href={localeHref(locale, "/shop")}
          className="border-ink text-ink hover:bg-ink hover:text-paper border px-6 py-3"
        >
          {dictionary.home.heroCta}
        </Link>
        <Link
          href={localeHref(locale, "/about")}
          className="text-ink-muted hover:text-ink px-6 py-3"
        >
          {dictionary.home.secondaryCta}
        </Link>
      </div>
    </section>
  );
}

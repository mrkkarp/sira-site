import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Container, Section } from "@/components/layout";
import { OrderStatusPageContent } from "@/components/order-status/order-status-page-content";
import { buildUtilityPageMetadata } from "@/lib/seo/placeholder-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  return buildUtilityPageMetadata(
    locale,
    "/order-status",
    dictionary.pages.orderStatus,
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  return (
    <Section>
      <Container className="max-w-2xl">
        <h1 className="type-h1 text-text mb-(--space-lg)">
          {dictionary.pages.orderStatus}
        </h1>
        <OrderStatusPageContent locale={locale} dictionary={dictionary} />
      </Container>
    </Section>
  );
}

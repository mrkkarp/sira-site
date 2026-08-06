import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localeHref } from "@/lib/locale-href";
import { Section, Container, Grid } from "@/components/layout";
import { LinkButton } from "@/components/ui/link-button";
import { BrandEyebrow } from "@/components/brand";

/** Dark, contrasting "Для дизайнерів" block (Prompt 4 §10). */
export function DesignersCta({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const copy = dictionary.home.designers;

  return (
    <Section tone="dark" spacing="xl">
      <Container>
        <Grid>
          <div className="col-span-4 md:col-span-8 lg:col-span-6">
            {/* `tone="dark"` swaps the ink for `--brand-accent-on-dark`: the
                ink measures 2.65:1 on this band, so the light-surface value is
                not merely off-brand here, it is illegible. */}
            <BrandEyebrow tone="dark">{copy.eyebrow}</BrandEyebrow>
            <h2 className="type-display-l text-background mt-(--space-xs)">
              {copy.heading}
            </h2>
            <p className="type-body-lg text-background/85 mt-(--space-sm)">
              {copy.body}
            </p>
            <LinkButton
              href={localeHref(locale, "/designers")}
              variant="outline-light"
              className="mt-(--space-md)"
            >
              {copy.cta}
            </LinkButton>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
            <ul className="type-body text-background/85 flex flex-col gap-(--space-xs)">
              {copy.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="border-background/20 border-t pt-(--space-xs)"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}

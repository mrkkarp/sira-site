"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Stack } from "@/components/layout/stack";
import { Inline } from "@/components/layout/inline";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Accordion,
  Badge,
  Breadcrumbs,
  Button,
  Checkbox,
  Divider,
  EmptyState,
  FormField,
  IconButton,
  Modal,
  Pagination,
  Price,
  QuantitySelector,
  RadioGroup,
  Drawer,
  SearchField,
  Select,
  Skeleton,
  Swatch,
  Tabs,
  TextLink,
  ToastProvider,
  useToast,
  VisuallyHidden,
} from "@/components/ui";
import productColours from "@/data/product-colours.json";

const neutralTokens = [
  ["--color-background", "#F1EEE7"],
  ["--color-surface", "#FAF9F5"],
  ["--color-surface-muted", "#E7E2D9"],
  ["--color-text", "#1D1D1B"],
  ["--color-text-muted", "#68655F"],
  ["--color-border", "#D5CFC5"],
  ["--color-border-strong", "#9E9991"],
  ["--color-footer", "#20201E"],
  ["--color-focus", "#2457D6"],
  ["--color-error", "#B3261E"],
  ["--color-success", "#296B3D"],
] as const;

const accentTokens = [
  ["--color-concrete-light", "#C9C4BA"],
  ["--color-concrete-grey", "#9E9D98"],
  ["--color-graphite", "#343536"],
  ["--color-dusty-pink", "#C99599"],
  ["--color-terracotta", "#B85B42"],
  ["--color-muted-olive", "#7B806B"],
  ["--color-industrial-blue", "#5D7882"],
  ["--color-warm-cream", "#D8D0B8"],
] as const;

function ToastDemo() {
  const { show } = useToast();
  return (
    <Inline gap="xs">
      <Button
        variant="outline"
        size="sm"
        onClick={() => show("Saved.", "success")}
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => show("Something went wrong.", "error")}
      >
        Error toast
      </Button>
    </Inline>
  );
}

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [swatch, setSwatch] = useState(productColours[0]?.slug);

  return (
    <ToastProvider>
      <Container className="flex flex-col gap-(--space-2xl) py-(--space-xl)">
        <Stack gap="2xs">
          <p className="type-eyebrow text-text-muted">Development only</p>
          <h1 className="type-display-l text-text">ODUDLAB design system</h1>
          <p className="type-body text-text-muted max-w-xl">
            Live reference for tokens and components in this repo. Not part of
            the public site — see <code>src/proxy.ts</code> and this
            route&apos;s layout guard.
          </p>
        </Stack>

        <section>
          <SectionHeader eyebrow="§2" heading="Colour" />
          <div className="mt-(--space-sm) grid grid-cols-2 gap-(--space-sm) sm:grid-cols-4 lg:grid-cols-6">
            {[...neutralTokens, ...accentTokens].map(([name, hex]) => (
              <Stack key={name} gap="3xs">
                <div
                  className="border-border h-16 w-full border"
                  style={{ backgroundColor: hex }}
                />
                <p className="type-technical-label text-text-muted">{name}</p>
                <p className="type-technical-value text-text">{hex}</p>
              </Stack>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="§3" heading="Typography" />
          <Stack gap="sm" className="mt-(--space-sm)">
            <p className="type-display-xl text-text">Display XL</p>
            <p className="type-display-l text-text">Display L</p>
            <p className="type-h1 text-text">Heading 1</p>
            <p className="type-h2 text-text">Heading 2</p>
            <p className="type-h3 text-text">Heading 3</p>
            <p className="type-h4 text-text">Heading 4</p>
            <p className="type-body-lg text-text">
              Body large — the quick brown fox.
            </p>
            <p className="type-body text-text">
              Body — the quick brown fox jumps over the lazy dog.
            </p>
            <p className="type-body-sm text-text">
              Body small — the quick brown fox jumps over the lazy dog.
            </p>
            <p className="type-label text-text">Label</p>
            <p className="type-eyebrow text-text-muted">Eyebrow</p>
            <p className="type-caption text-text-muted">Caption</p>
            <p className="type-price text-text">1 250 ₴ · Price</p>
            <p className="type-nav text-text">Navigation</p>
            <p className="type-technical-value text-text">
              85 см · Technical value
            </p>
            <p className="type-technical-label text-text-muted">
              Висота · Technical label
            </p>
          </Stack>
        </section>

        <section>
          <SectionHeader eyebrow="§6" heading="Buttons & links" />
          <Stack gap="sm" className="mt-(--space-sm)">
            <Inline gap="xs">
              <Button variant="primary-dark">Primary dark</Button>
              <Button variant="primary-light">Primary light</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost / text</Button>
              <Button variant="primary-dark" disabled>
                Disabled
              </Button>
            </Inline>
            <Inline gap="xs">
              <TextLink href="#">Plain link</TextLink>
              <TextLink href="#" variant="underlined">
                Underlined editorial link
              </TextLink>
              <IconButton
                aria-label="Example icon button"
                icon={
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                  >
                    <path
                      d="M12 21s-7-4.35-9.5-9C.8 8.2 2.6 4.5 6 4.5c2 0 3.4 1.1 4 2.2.6-1.1 2-2.2 4-2.2 3.4 0 5.2 3.7 3.5 7.5C19 16.65 12 21 12 21z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                }
              />
            </Inline>
          </Stack>
        </section>

        <section>
          <SectionHeader eyebrow="§2.5" heading="Product colour swatches" />
          <Inline gap="sm" className="mt-(--space-sm)">
            {productColours.map((colour) => (
              <Swatch
                key={colour.slug}
                colour={colour}
                selected={swatch === colour.slug}
                onSelect={setSwatch}
              />
            ))}
          </Inline>
        </section>

        <section>
          <SectionHeader heading="Badges, price, divider" />
          <Stack gap="sm" className="mt-(--space-sm)">
            <Inline gap="xs">
              <Badge>В наявності</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="error">Error</Badge>
            </Inline>
            <Price amount={15150} compareAtAmount={18200} locale="uk" />
            <Divider />
          </Stack>
        </section>

        <section>
          <SectionHeader heading="Forms" />
          <Stack gap="md" className="mt-(--space-sm) max-w-sm">
            <FormField id="ds-name" label="Ім'я" hint="Як до вас звертатися">
              {(props) => (
                <input
                  {...props}
                  className="border-border-strong bg-surface type-body-sm h-11 border px-(--space-sm)"
                />
              )}
            </FormField>
            <SearchField label="Пошук товарів" />
            <Select
              options={[
                { value: "asc", label: "Ціна: спочатку дешевші" },
                { value: "desc", label: "Ціна: спочатку дорожчі" },
              ]}
            />
            <Checkbox id="ds-checkbox" label="Погоджуюсь з умовами" />
            <RadioGroup
              name="ds-radio"
              legend="Спосіб доставки"
              value="pickup"
              options={[
                { value: "pickup", label: "Самовивіз" },
                { value: "courier", label: "Кур'єр" },
              ]}
            />
            <QuantitySelector />
          </Stack>
        </section>

        <section>
          <SectionHeader heading="Skeleton, empty state, breadcrumbs, pagination" />
          <Stack gap="md" className="mt-(--space-sm)">
            <Inline gap="xs">
              <Skeleton className="h-16 w-16" />
              <Skeleton className="h-16 w-40" />
            </Inline>
            <Breadcrumbs
              items={[
                { label: "Головна", href: "#" },
                { label: "Раковини", href: "#" },
                { label: "ODRI" },
              ]}
            />
            <Pagination
              currentPage={2}
              totalPages={5}
              getHref={(page) => `#page-${page}`}
            />
            <EmptyState
              heading="Нічого не знайдено"
              description="Спробуйте інший запит."
            />
          </Stack>
        </section>

        <section>
          <SectionHeader heading="Accordion & tabs" />
          <div className="mt-(--space-sm) grid gap-(--space-lg) md:grid-cols-2">
            <Accordion
              items={[
                {
                  id: "a",
                  trigger: "Матеріал",
                  content: "Архітектурний бетон.",
                },
                {
                  id: "b",
                  trigger: "Доставка",
                  content: "Нова пошта, кур'єр, самовивіз.",
                },
              ]}
            />
            <Tabs
              label="Product details"
              items={[
                { id: "desc", label: "Опис", content: "Короткий опис товару." },
                {
                  id: "specs",
                  label: "Характеристики",
                  content: "Висота, діаметр, вага.",
                },
              ]}
            />
          </div>
        </section>

        <section>
          <SectionHeader heading="Modal, drawer, toast" />
          <Inline gap="xs" className="mt-(--space-sm)">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <ToastDemo />
          </Inline>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Замовити дзвінок"
          >
            <p className="type-body-sm text-text-muted">
              Modal content example.
            </p>
          </Modal>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Кошик"
          >
            <p className="type-body-sm text-text-muted">
              Drawer content example.
            </p>
          </Drawer>
        </section>

        <VisuallyHidden>
          This text is only for assistive technology.
        </VisuallyHidden>
      </Container>
    </ToastProvider>
  );
}

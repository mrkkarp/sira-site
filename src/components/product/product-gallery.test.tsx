import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { getDictionary } from "@/i18n/get-dictionary";
import { ProductGallery } from "@/components/product/product-gallery";
import type { GalleryMediaItem } from "@/lib/gallery-media";

const twoPhotos: GalleryMediaItem[] = [
  { type: "photo", src: "/a.jpg", alt: "Odri — photo 1" },
  { type: "photo", src: "/b.jpg", alt: "Odri — photo 2" },
];

describe("ProductGallery", () => {
  it("renders a single real photo with no thumbnail strip when there's nothing else to show", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductGallery
        media={[{ type: "photo", src: "/a.jpg", alt: "Odri" }]}
        brokenImageLabel="broken"
        dictionary={dictionary}
      />,
    );
    expect(screen.getByAltText("Odri")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation between real focusable thumbnails", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductGallery
        media={twoPhotos}
        brokenImageLabel="broken"
        dictionary={dictionary}
      />,
    );

    const thumbnails = screen.getAllByRole("option");
    expect(thumbnails).toHaveLength(2);
    expect(thumbnails[0].tagName).toBe("BUTTON");
    expect(thumbnails[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(thumbnails[1]);
    expect(thumbnails[1]).toHaveAttribute("aria-selected", "true");
    expect(
      within(screen.getByTestId("gallery-active")).getByAltText(
        "Odri — photo 2",
      ),
    ).toBeInTheDocument();
  });

  it("resets to the first item when the media set changes (e.g. a colour switch)", async () => {
    const dictionary = await getDictionary("uk");
    const { rerender } = render(
      <ProductGallery
        media={twoPhotos}
        brokenImageLabel="broken"
        dictionary={dictionary}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[1]);
    expect(
      within(screen.getByTestId("gallery-active")).getByAltText(
        "Odri — photo 2",
      ),
    ).toBeInTheDocument();

    const customColourPhotos: GalleryMediaItem[] = [
      { type: "photo", src: "/c.jpg", alt: "Odri custom — photo 1" },
    ];
    rerender(
      <ProductGallery
        media={customColourPhotos}
        brokenImageLabel="broken"
        dictionary={dictionary}
      />,
    );
    expect(screen.getByAltText("Odri custom — photo 1")).toBeInTheDocument();
  });

  it("opens a focus-trapping fullscreen lightbox with a counter", async () => {
    const dictionary = await getDictionary("uk");
    render(
      <ProductGallery
        media={twoPhotos}
        brokenImageLabel="broken"
        dictionary={dictionary}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: dictionary.product.galleryOpenLightbox,
      }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("1 з 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

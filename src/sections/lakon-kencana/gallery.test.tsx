import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldRenderer, ImageInput } from "@/components/builder/field-editors";
import { Inspector } from "@/components/builder/inspector";
import { STANDARD_COMPOSITION_POLICY } from "@/lib/templates/composition-policy";
import { useBuilder } from "@/stores/builder-store";
import { variantDefaultProps } from "../registry";
import { CompositionSchema } from "../schema";
import type { SectionData } from "../types";
import { LAKON_ID } from "./data";
import { GalleryLakon } from "./gallery";
import { Photo } from "./primitives";

const hooks = vi.hoisted(() => ({
  state: new Map<number, unknown>(),
  cursor: 0,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    return [
      hooks.state.has(slot) ? hooks.state.get(slot) : initial,
      (next: unknown) => hooks.state.set(slot, next),
    ];
  },
  useRef: (current: unknown) => ({ current }),
  useEffect: vi.fn(),
  useId: () => "gallery-heading",
}));
vi.mock("@/stores/builder-store", async (original) => {
  const store = await original<typeof import("@/stores/builder-store")>();
  const useBuilder = Object.assign(
    (
      select: (state: ReturnType<typeof store.useBuilder.getState>) => unknown,
    ) => select(store.useBuilder.getState()),
    store.useBuilder,
  );
  return { ...store, useBuilder };
});

type Element = ReactElement<{
  children?: ReactNode;
  "aria-label"?: string;
  "data-lakon-lightbox"?: boolean;
}>;

function find<T extends Element>(
  tree: ReactNode,
  matches: (node: Element) => boolean,
): T {
  function search(tree: ReactNode): Element | undefined {
    for (const node of Children.toArray(tree)) {
      if (!isValidElement<Element["props"]>(node)) continue;
      if (matches(node)) return node;
      const match = search(node.props.children);
      if (match) return match;
    }
  }
  const match = search(tree);
  if (!match) throw new Error("Expected gallery element is missing");
  return match as T;
}

const global = useBuilder.getState().global;
const replacement = "https://media.example.com/replacement.webp";
const customFull = "https://media.example.com/full.webp";
type Image = { url: string; caption?: string; full_url?: string };

function fixture() {
  return {
    id: "gallery",
    type: "gallery",
    variant: LAKON_ID,
    order: 0,
    visible: true,
    props: variantDefaultProps("gallery", LAKON_ID) as { images: Image[] },
  } satisfies SectionData;
}

const [demoPortrait, demoRings] = fixture().props.images;

function load(sections: SectionData[], settings = global) {
  useBuilder.getState().load({
    invitationId: "gallery-fixture",
    sections,
    global: settings,
    locked: false,
    compositionPolicy: STANDARD_COMPOSITION_POLICY,
  });
  useBuilder.getState().select(sections[0].id);
}

function renderGallery(props: SectionData["props"]) {
  hooks.cursor = 0;
  return GalleryLakon({ props, global });
}

function click(tree: ReactNode, label: string) {
  const button = find<
    Element & { props: { onClick: (event: { currentTarget: object }) => void } }
  >(
    tree,
    (node) => node.type === "button" && node.props["aria-label"] === label,
  );
  button.props.onClick({ currentTarget: {} });
}

function renderLightbox(props: SectionData["props"]) {
  const gallery = renderGallery(props);
  // The lightbox is the sibling of the carousel inside the Section.
  const box = Children.toArray(gallery?.props.children)
    .filter(isValidElement)
    .at(-1)!;
  const Box = box.type as (props: typeof box.props) => ReactNode;
  return Box(box.props);
}

function photoSrc(tree: ReactNode) {
  return find<Element & { props: { src: string } }>(
    tree,
    (node) => node.type === Photo,
  ).props.src;
}

afterEach(() => {
  hooks.state.clear();
  useBuilder.temporal.getState().clear();
});

describe("Lakon Kencana gallery", () => {
  it("keeps the matching demo originals available through lightbox navigation", () => {
    const { props } = fixture();
    const [first, second, last] = props.images;
    const gallery = renderGallery(props);
    expect(photoSrc(gallery)).toBe(first.url);
    click(gallery, "Perbesar foto 1");

    const lightbox = renderLightbox(props);
    expect(photoSrc(lightbox)).toBe(first.full_url);
    click(lightbox, "Foto sebelumnya");
    expect(photoSrc(renderLightbox(props))).toBe(last.full_url);
    click(renderLightbox(props), "Foto berikutnya");

    const dialog = find<
      Element & { props: { onKeyDown: (event: object) => void } }
    >(
      renderLightbox(props),
      (node) => node.props["data-lakon-lightbox"] === true,
    );
    dialog.props.onKeyDown({
      key: "ArrowRight",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    expect(photoSrc(renderLightbox(props))).toBe(second.full_url);
    click(renderLightbox(props), "Tutup galeri");
    expect(renderGallery(props)?.props.children[1]).toBeFalsy();
  });

  it.each([
    ["a replacement photo", replacement, demoPortrait.full_url, replacement],
    [
      "a different demo photo",
      demoRings.url,
      demoPortrait.full_url,
      demoRings.url,
    ],
    [
      "a stale absolute demo URL",
      replacement,
      `https://old.example.com${demoPortrait.full_url}?v=1`,
      replacement,
    ],
    ["a custom full-resolution image", replacement, customFull, customFull],
    ["an empty full URL", replacement, "", replacement],
    [
      "an invalid full URL",
      replacement,
      "data:image/webp;base64,invalid",
      replacement,
    ],
  ])("resolves %s in the lightbox", (_name, url, full_url, expected) => {
    const props = { images: [{ url, full_url }] };
    click(renderGallery(props), "Perbesar foto 1");
    expect(photoSrc(renderLightbox(props))).toBe(expected);
  });

  it("clears the old original in one Inspector edit and keeps the saved replacement on reload", () => {
    const section = fixture();
    const original = structuredClone(section.props.images);
    load([section]);
    const inspector = Inspector({
      invitationId: "gallery-fixture",
      activeTemplateName: "Lakon Kencana",
      onChangeTemplate: vi.fn(),
      changeTemplatePending: false,
    });
    const fields = find<
      Element & { props: Parameters<typeof FieldRenderer>[0] }
    >(
      inspector,
      (node) =>
        node.type === FieldRenderer &&
        (node.props as { field?: { key?: string } }).field?.key === "images",
    );
    const { ctx, field } = fields.props;
    if (field.kind !== "array") throw new Error("Missing gallery array field");
    const imageField = field.itemFields.find((item) => item.kind === "image")!;
    const imageEditor = FieldRenderer({
      field: imageField,
      ctx,
      prefix: "images.0",
    });
    const scalar = Children.toArray(imageEditor.props.children)
      .filter(isValidElement)
      .at(-1)!;
    const Scalar = scalar.type as (props: typeof scalar.props) => ReactNode;
    const input = find<
      Element & { props: { onChange: (url: string) => void } }
    >(Scalar(scalar.props), (node) => node.type === ImageInput);

    // A completed upload can call the input callback after a caption edit.
    ctx.write("images.0.caption", "Updated caption");
    const beforeReplacement = useBuilder.getState().sections;
    const snapshots: SectionData[][] = [];
    const unsubscribe = useBuilder.subscribe((state) =>
      snapshots.push(state.sections),
    );
    try {
      input.props.onChange(replacement);
    } finally {
      unsubscribe();
    }
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0][0].props.images).toEqual([
      { url: replacement, caption: "Updated caption" },
      ...original.slice(1),
    ]);
    expect(section.props.images).toEqual(original);
    expect(useBuilder.getState().dirty).toBe(true);

    // One undo or redo restores the entire image pair without losing the caption.
    const history = useBuilder.temporal.getState();
    history.undo();
    expect(useBuilder.getState().sections).toEqual(beforeReplacement);
    history.redo();
    expect(useBuilder.getState().sections).toEqual(snapshots[0]);

    const saved = CompositionSchema.parse(
      JSON.parse(
        JSON.stringify({
          sections: useBuilder.getState().sections,
          global_settings: global,
        }),
      ),
    );
    load(saved.sections, saved.global_settings);
    const props = useBuilder.getState().sections[0].props;
    click(renderGallery(props), "Perbesar foto 1");
    expect(photoSrc(renderLightbox(props))).toBe(replacement);
  });

  it("preserves an explicitly set full URL until the photo changes", () => {
    const section = fixture();
    load([section]);
    const { setProp } = useBuilder.getState();
    const images = () => useBuilder.getState().sections[0].props.images;

    setProp(section.id, "images.0.full_url", customFull);
    setProp(section.id, "images.0.url", demoPortrait.url);
    expect(images()).toMatchObject([{ full_url: customFull }, demoRings, {}]);

    setProp(section.id, "images.0.url", "");
    expect(images()).toMatchObject([{ url: "" }, demoRings, {}]);
    expect(images()).not.toHaveProperty("0.full_url");
  });

  it("leaves other gallery variants' fields alone", () => {
    const section = { ...fixture(), variant: "grid" };
    load([section]);
    useBuilder.getState().setProp(section.id, "images.0.url", replacement);
    expect(useBuilder.getState().sections[0].props.images).toMatchObject([
      { url: replacement, full_url: demoPortrait.full_url },
      demoRings,
      {},
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { getCompositionPolicy } from "./composition-policy";
import { getTemplate } from "./catalog";
import {
  hydrateTemplateSections,
  mergeInvitationGlobalSettings,
  mergeInvitationIntoTemplate,
  mergeValue,
} from "./hydrate";
import type { SectionData } from "@/sections/types";
import type { TemplatePreset } from "./catalog";

const template = (id: string) => {
  const value = getTemplate(id);
  if (!value) throw new Error(`Missing test template: ${id}`);
  return value;
};

const instantiate = (preset: TemplatePreset): SectionData[] =>
  hydrateTemplateSections(preset).map((section, index) => ({
    ...section,
    id: `existing-${index}`,
  }));

const byType = (sections: SectionData[], type: string, occurrence = 0) => {
  const value = sections.filter((section) => section.type === type)[occurrence];
  if (!value) throw new Error(`Missing section: ${type}[${occurrence}]`);
  return value;
};

describe("mergeValue", () => {
  it("keeps the default when the override is empty", () => {
    expect(mergeValue("default.jpg", "")).toBe("default.jpg");
    expect(mergeValue([1, 2], [])).toEqual([1, 2]);
    expect(mergeValue("x", null)).toBe("x");
    expect(mergeValue("x", undefined)).toBe("x");
  });

  it("takes the override when it is non-empty", () => {
    expect(mergeValue("default.jpg", "custom.jpg")).toBe("custom.jpg");
    expect(mergeValue([1], [2, 3])).toEqual([2, 3]);
  });

  it("merges plain objects one level deep", () => {
    const def = { name: "Default", photo: "d.jpg" };
    expect(mergeValue(def, { name: "Dinda" })).toEqual({
      name: "Dinda",
      photo: "d.jpg",
    });
  });

  it("does not merge arrays as objects", () => {
    expect(mergeValue([{ a: 1 }], [{ b: 2 }])).toEqual([{ b: 2 }]);
  });
});

describe("hydrateTemplateSections", () => {
  const preset: TemplatePreset = {
    id: "t",
    name: "T",
    description: "",
    category: "wedding",
    tier: "free",
    thumbnail: "",
    global_settings: {} as TemplatePreset["global_settings"],
    sections: [
      { type: "gift", variant: "minimal", order: 5, visible: true, props: {} },
      {
        type: "couple-intro",
        variant: "side-by-side",
        order: 0,
        visible: true,
        props: { bride: { full_name: "Dinda" } },
      },
    ],
  } as TemplatePreset;

  const out = hydrateTemplateSections(preset);

  it("uses array position as the order", () => {
    expect(out.map((s) => s.order)).toEqual([0, 1]);
  });

  it("fills empty props from variant defaults (dummy data)", () => {
    const gift = out[0].props as { bank_accounts?: unknown[] };
    expect(Array.isArray(gift.bank_accounts)).toBe(true);
    expect((gift.bank_accounts ?? []).length).toBeGreaterThan(0);
  });

  it("deep-merges so an override keeps sibling defaults", () => {
    const couple = out[1].props as { bride?: Record<string, unknown> };
    expect(couple.bride?.full_name).toBe("Dinda");
    expect(couple.bride?.photo).toBeTruthy(); // dummy photo preserved
  });
});

describe("mergeInvitationGlobalSettings", () => {
  const existing = {
    font_family: "Old Font",
    color_primary: "#111111",
    color_secondary: "#222222",
    color_background: "#333333",
    animation: "flip",
    animation_repeat: true,
    presentationMode: "simple",
    music_url: "https://example.com/user-song.mp3",
    cover_note: "Catatan pengguna",
  };

  it("lets cinematic target presentation win while preserving content and a valid mode", () => {
    const target = template("cinematic-vintage").global_settings;
    const merged = mergeInvitationGlobalSettings(existing, target, true, true);

    expect(merged).toMatchObject(target);
    expect(merged.font_family).toBe(target.font_family);
    expect(merged.animation).toBe(target.animation);
    expect(merged.animation_repeat).toBeUndefined();
    expect(merged.presentationMode).toBe("simple");
    expect(merged.music_url).toBe(existing.music_url);
    expect(merged.cover_note).toBe(existing.cover_note);
  });

  it("does not leak a stale standard-template mode into cinematic", () => {
    const target = template("cinematic-vintage").global_settings;
    const merged = mergeInvitationGlobalSettings(existing, target, false, true);

    expect(merged.presentationMode).toBe("cinematic");
  });

  it("defaults a standard-to-Sekar-Jawa-3D change to cinematic mode", () => {
    const target = template("sekar-jawa-3d").global_settings;
    const merged = mergeInvitationGlobalSettings(existing, target, false, true);

    expect(merged.presentationMode).toBe("cinematic");
  });

  it("removes cinematic presentationMode when switching to standard", () => {
    const target = template("kana-noir").global_settings;
    const merged = mergeInvitationGlobalSettings(existing, target, true, false);

    expect(merged.font_family).toBe(target.font_family);
    expect(merged.animation).toBe(target.animation);
    expect(merged).not.toHaveProperty("presentationMode");
    expect(merged.music_url).toBe(existing.music_url);
  });
});

describe("mergeInvitationIntoTemplate", () => {
  it("preserves content and IDs but applies target presentation for standard to standard", () => {
    const source = template("navy-elegan");
    const target = template("kana-noir");
    const existing = instantiate(source);
    const hero = byType(existing, "hero");
    const gallery = byType(existing, "gallery");

    hero.props = {
      ...hero.props,
      couple_names: "Alya & Bima",
      background_image: "/uploads/user-couple.jpg",
      garland_left_image: "/old-template/garland.png",
      s_palette: "old-palette",
    };
    hero.style_overrides = { frame: "old-frame" };
    gallery.props = {
      ...gallery.props,
      images: [{ url: "/uploads/gallery.jpg", caption: "Kenangan kami" }],
      columns: 4,
      s_gap: "loose",
    };

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const targetHero = byType(hydrateTemplateSections(target), "hero");
    const targetGallery = byType(hydrateTemplateSections(target), "gallery");
    const nextHero = byType(merged, "hero");
    const nextGallery = byType(merged, "gallery");

    expect(nextHero.id).toBe(hero.id);
    expect(nextGallery.id).toBe(gallery.id);
    expect(nextHero.variant).toBe(targetHero.variant);
    expect(nextGallery.variant).toBe(targetGallery.variant);
    expect(nextHero.props.couple_names).toBe("Alya & Bima");
    expect(nextHero.props.background_image).toBe("/uploads/user-couple.jpg");
    expect(nextHero.props.s_palette).toBe(targetHero.props.s_palette);
    expect(nextHero.props.garland_left_image).toBe(
      targetHero.props.garland_left_image,
    );
    expect(nextHero.style_overrides).toEqual(targetHero.style_overrides);
    expect(nextGallery.props.images).toEqual([
      { url: "/uploads/gallery.jpg", caption: "Kenangan kami" },
    ]);
    expect(nextGallery.props.columns).toBe(targetGallery.props.columns);
    expect(nextGallery.props.s_gap).toBe(targetGallery.props.s_gap);
    expect(new Set(merged.map((section) => section.id)).size).toBe(
      merged.length,
    );
    expect(
      getCompositionPolicy({
        composition: target.composition ?? "standard",
      }).composition,
    ).toBe("standard");
  });

  it("hydrates Sekar Jawa 3D through the generic wedding merge", () => {
    const source = template("navy-elegan");
    const target = template("sekar-jawa-3d");
    const existing = instantiate(source);
    const hero = byType(existing, "hero");
    hero.props = { ...hero.props, couple_names: "Alya & Bima" };

    const merged = mergeInvitationIntoTemplate(existing, source, target);

    expect(byType(merged, "hero")).toMatchObject({
      id: hero.id,
      variant: "sekar-jawa-3d",
      props: expect.objectContaining({ couple_names: "Alya & Bima" }),
    });
    expect(new Set(merged.map((section) => section.id)).size).toBe(merged.length);
  });

  it("activates cinematic variants and locks without losing user content", () => {
    const source = template("navy-elegan");
    const target = template("cinematic-vintage");
    const existing = instantiate(source);
    const couple = byType(existing, "couple-intro");
    const events = byType(existing, "event-details");
    const gallery = byType(existing, "gallery");
    const userEvents = [
      {
        name: "Akad Pengguna",
        date: "2027-01-02T00:00:00.000Z",
        start_time: "08:30",
        venue_name: "Rumah Keluarga",
        address: "Alamat pengguna",
      },
    ];

    couple.props = {
      ...couple.props,
      bride: { name: "Alya", photo: "/uploads/alya.jpg" },
      groom: { name: "Bima", photo: "/uploads/bima.jpg" },
    };
    events.props = { ...events.props, events: userEvents };
    gallery.props = {
      ...gallery.props,
      images: [{ url: "/uploads/cinematic-gallery.jpg", caption: "Kami" }],
    };

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const policy = getCompositionPolicy({
      composition: target.composition ?? "standard",
    });

    expect(byType(merged, "couple-intro").id).toBe(couple.id);
    expect(byType(merged, "couple-intro").props.bride).toMatchObject({
      name: "Alya",
      photo: "/uploads/alya.jpg",
    });
    expect(byType(merged, "event-details").props.events).toEqual(userEvents);
    expect(byType(merged, "gallery").props.images).toEqual([
      { url: "/uploads/cinematic-gallery.jpg", caption: "Kami" },
    ]);
    for (const type of [
      "cover",
      "hero",
      "couple-intro",
      "quote",
      "gallery",
      "event-details",
      "map-location",
      "closing",
    ]) {
      expect(byType(merged, type).variant).toBe("cinematic-vintage");
    }
    expect(policy).toMatchObject({
      composition: "cinematic-vintage",
      canEditMotion: false,
      canEditCoreVariant: false,
      canReorderCoreSection: false,
    });
    expect(new Set(merged.map((section) => section.id)).size).toBe(
      merged.length,
    );
  });

  it("returns to standard variants and policy while retaining cinematic content", () => {
    const source = template("cinematic-vintage");
    const target = template("sage-emas-klasik");
    const existing = instantiate(source);
    const hero = byType(existing, "hero");
    const quote = byType(existing, "quote");
    const gallery = byType(existing, "gallery");

    hero.props = {
      ...hero.props,
      couple_names: "Citra & Damar",
      background_image: "/uploads/cinematic-hero.jpg",
    };
    quote.props = { ...quote.props, text: "Kutipan pilihan pengguna" };
    gallery.props = {
      ...gallery.props,
      images: [{ url: "/uploads/kept.jpg", caption: "Tetap ada" }],
    };

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const policy = getCompositionPolicy({
      composition: target.composition ?? "standard",
    });

    expect(byType(merged, "hero").id).toBe(hero.id);
    expect(byType(merged, "hero").variant).not.toBe("cinematic-vintage");
    expect(byType(merged, "hero").props.couple_names).toBe("Citra & Damar");
    expect(byType(merged, "quote").props.text).toBe("Kutipan pilihan pengguna");
    expect(byType(merged, "gallery").props.images).toEqual([
      { url: "/uploads/kept.jpg", caption: "Tetap ada" },
    ]);
    expect(
      merged.every((section) => section.variant !== "cinematic-vintage"),
    ).toBe(true);
    expect(policy).toMatchObject({
      composition: "standard",
      canEditMotion: true,
      canEditCoreVariant: true,
      canReorderCoreSection: true,
    });
  });

  it("preserves a section missing from the target exactly once", () => {
    const source = template("navy-elegan");
    const target = template("cinematic-vintage");
    const existing = instantiate(source);
    const story = byType(existing, "story");
    story.props = {
      ...story.props,
      title: "Perjalanan pengguna",
      items: [{ year: "2026", title: "Pertama bertemu" }],
    };

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const retainedStories = merged.filter(
      (section) => section.type === "story",
    );

    expect(retainedStories).toHaveLength(1);
    expect(retainedStories[0].id).toBe(story.id);
    expect(retainedStories[0].props).toMatchObject({
      title: "Perjalanan pengguna",
      items: [{ year: "2026", title: "Pertama bertemu" }],
    });
  });

  it("matches duplicate catalog types by occurrence without consuming either twice", () => {
    const source = template("navy-elegan");
    const target = { ...source, id: "navy-elegan-copy" };
    const existing = instantiate(source);
    const first = byType(existing, "family", 0);
    const second = byType(existing, "family", 1);
    first.props = { ...first.props, title: "Keluarga pertama" };
    second.props = { ...second.props, title: "Keluarga kedua" };

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const families = merged.filter((section) => section.type === "family");

    expect(families).toHaveLength(2);
    expect(families.map((section) => section.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(families.map((section) => section.props.title)).toEqual([
      "Keluarga pertama",
      "Keluarga kedua",
    ]);
  });

  it("keeps all IDs unique, retains safe matches and creates IDs for target-only slots", () => {
    const source = template("sage-emas-klasik");
    const target = template("navy-elegan");
    const existing = instantiate(source);
    const cover = byType(existing, "cover");
    const couple = byType(existing, "couple-intro");
    couple.id = cover.id;

    const merged = mergeInvitationIntoTemplate(existing, source, target);
    const ids = merged.map((section) => section.id);

    expect(new Set(ids).size).toBe(merged.length);
    expect(byType(merged, "cover").id).toBe(cover.id);
    expect(byType(merged, "hero").id).not.toBe(cover.id);
    expect(byType(merged, "couple-intro").id).not.toBe(cover.id);
  });
});

import { describe, expect, it } from "vitest";
import {
  filterTemplatesByCategory,
  isTemplateChangeCategoryCompatible,
} from "./compatibility";
import { TEMPLATES } from "./catalog";

describe("Change Template category compatibility", () => {
  it("allows only matching invitation, active-template and target categories", () => {
    expect(
      isTemplateChangeCategoryCompatible({
        invitationCategory: "wedding",
        sourceCategory: "wedding",
        targetCategory: "wedding",
      }),
    ).toBe(true);
    expect(
      isTemplateChangeCategoryCompatible({
        invitationCategory: "wedding",
        sourceCategory: "wedding",
        targetCategory: "aqiqah",
      }),
    ).toBe(false);
    expect(
      isTemplateChangeCategoryCompatible({
        invitationCategory: "wedding",
        sourceCategory: "birthday",
        targetCategory: "birthday",
      }),
    ).toBe(false);
  });

  it("filters only an existing invitation's Change Template choices", () => {
    const templates = [
      { id: "wedding-a", category: "wedding" as const },
      { id: "aqiqah-a", category: "aqiqah" as const },
      { id: "wedding-b", category: "wedding" as const },
    ];

    expect(
      filterTemplatesByCategory(templates, "wedding").map(({ id }) => id),
    ).toEqual(["wedding-a", "wedding-b"]);
    expect(templates).toHaveLength(3);
  });

  it("includes Sekar Jawa 3D through the generic wedding filter", () => {
    const wedding = filterTemplatesByCategory(TEMPLATES, "wedding");

    expect(wedding.some((template) => template.id === "sekar-jawa-3d")).toBe(true);
    expect(wedding.every((template) => template.category === "wedding")).toBe(true);
  });
});

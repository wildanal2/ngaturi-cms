import { describe, expect, it } from "vitest";
import {
  canPairLocation,
  ceremonyEvents,
  ceremonyGroups,
} from "./phase-two-data";

const maps = "https://maps.example/garden";
const location = {
  groups: "1",
  venue: "Taman Puspa",
  address: "Jalan Mawar 1",
  eventVenue: "Taman Puspa",
  eventAddress: "Jalan Mawar 1",
  maps,
  eventMaps: maps,
};

describe("Gerbang Puspa event/location presentation pairing", () => {
  it("shares an action slot for matching data and whitespace variations", () => {
    expect(canPairLocation(location)).toBe(true);
    expect(
      canPairLocation({
        ...location,
        venue: "  Taman   Puspa ",
        address: "Jalan\nMawar 1",
      }),
    ).toBe(true);
    expect(
      canPairLocation({ ...location, venue: "", address: "", eventMaps: "" }),
    ).toBe(true);
  });
  it.each([
    { groups: "2" },
    { groups: undefined },
    { venue: "Taman Lain" },
    { address: "Alamat lain" },
    { eventMaps: "https://maps.example/other" },
    { maps: undefined },
    { embed: "https://maps.example/embed" },
  ])("keeps an independent Location for %o", (patch) => {
    expect(canPairLocation({ ...location, ...patch })).toBe(false);
  });
  it("preserves authored order and separates different days, addresses and venues", () => {
    const events = ceremonyEvents([
      {
        name: "Akad",
        date: "2027-01-02",
        venue_name: "Taman",
        address: "A",
        maps_url: maps,
      },
      {
        name: "Resepsi",
        date: "2027-01-02",
        venue_name: "Taman",
        address: "A",
        maps_url: maps,
      },
      {
        name: "Syukuran",
        date: "2027-01-03",
        venue_name: "Taman",
        address: "A",
        maps_url: maps,
      },
      {
        name: "Keluarga",
        date: "2027-01-03",
        venue_name: "Rumah",
        address: "A",
        maps_url: maps,
      },
      {
        name: "Penutup",
        date: "2027-01-03",
        venue_name: "Rumah",
        address: "B",
        maps_url: maps,
      },
    ]);
    expect(
      ceremonyGroups(events).map((group) => group.map((event) => event.name)),
    ).toEqual([["Akad", "Resepsi"], ["Syukuran"], ["Keluarga"], ["Penutup"]]);
  });
});

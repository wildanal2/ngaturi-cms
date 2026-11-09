/** Local-only acceptance fixture. Copied into a disposable build by the verifier;
 * this file is never a production App Router route in the repository. */
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";

export default async function Fixture({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const template = getTemplate("lakon-kencana")!;
  const sections = hydrateTemplateSections(template);
  const by = (type: string) => sections.find((s) => s.type === type)!;
  if (query.gift === "1") {
    by("gift").visible = true;
    by("gift").props.bank_accounts = [
      {
        bank_name: "Bank Uji",
        account_number: "0000000000",
        account_name: "Rekening Fixture Lokal",
      },
    ];
  }
  if (query.map === "1") {
    by("map-location").visible = true;
    by("map-location").props = {
      venue_name: "Lokasi Fixture",
      address: "Alamat pengujian lokal",
      maps_url: "https://www.google.com/maps/search/?api=1&query=Yogyakarta",
    };
  }
  if (query.audio === "1")
    by("music").props = {
      audio_url: "/__fixture-tone.wav",
      autoplay: true,
      track_title: "Nada uji lokal",
    };
  if (query.stress === "1") {
    const names =
      "Raden Aditya Pradipta Kusumaningrat & Raden Ajeng Anindya Sekar Ayuningtyas";
    by("cover").props.names = names;
    by("hero").props.couple_names = names;
    by("closing").props.names = names;
    by("couple-intro").props.groom = {
      name: "Aditya Pradipta Kusumaningrat",
      full_name: "Raden Aditya Pradipta Kusumaningrat",
      parents:
        "Bapak Wiryadiningrat Kusumawardhana dan Ibu Dyah Puspitaningrum Keluarga Besar Adinagoro",
      child_order: "Putra pertama dari keluarga",
      photo: "/themes/lakon-kencana/demo-portrait.webp",
    };
    by("couple-intro").props.bride = {
      name: "Anindya Sekar Ayuningtyas",
      full_name: "Raden Ajeng Anindya Sekar Ayuningtyas",
      parents:
        "Bapak Pramudita Suryaningrat dan Ibu Sekar Lestari Ratnaningsih Keluarga Besar Wiratama",
      child_order: "Putri kedua dari keluarga",
      photo: "/themes/lakon-kencana/demo-portrait.webp",
    };
    by("event-details").props.events = Array.from({ length: 4 }, (_, i) => ({
      name: [
        "Akad Nikah",
        "Upacara Panggih",
        "Resepsi Keluarga",
        "Perayaan Bersama Sahabat",
      ][i],
      date: "2027-11-12",
      start_time: ["08:00", "10:00", "12:00", "17:00"][i],
      end_time: ["09:00", "11:00", "15:00", "20:00"][i],
      venue_name: "Pendapa Keluarga Besar Kusumaningrat dan Ayuningtyas",
      address:
        "Jalan Pengujian Lokal Nomor 123, Dusun dengan Alamat Sangat Panjang, Kecamatan Pengujian, Daerah Istimewa Yogyakarta. Ini adalah fixture lokal, bukan lokasi undangan.",
      maps_url: "https://www.google.com/maps/search/?api=1&query=Yogyakarta",
    }));
    by("rsvp").props.max_guests_per_person = 5;
  }
  if (query.empty === "1") {
    for (const type of ["story", "quote", "gallery", "gift", "map-location"]) {
      by(type).visible = true;
      by(type).props = { items: [], images: [], bank_accounts: [], text: "" };
    }
  }
  if (query.nocover === "1") by("cover").visible = false;
  if (query.gallery7 === "1") {
    const images = by("gallery").props.images as Record<string, unknown>[];
    by("gallery").props.images = Array.from({ length: 7 }, (_, i) => ({
      ...images[i % images.length],
      caption: `Foto fixture ${i + 1}`,
    }));
  }
  if (query.nonav === "1") by("navigation").visible = false;
  if (query.order === "1") {
    const events = by("event-details");
    events.order = 2.5;
    by("gallery").order = 3.5;
  }
  if (query.broken === "1") {
    by("hero").props.background_image = "/missing-photo.webp";
    by("gallery").props.images = [
      { url: "/missing-gallery.webp", caption: "Gambar gagal pada fixture" },
    ];
    by("music").props = { audio_url: "/missing-audio.mp3", autoplay: true };
  }
  return (
    <InvitationRenderer
      key={JSON.stringify(query)}
      sections={sections}
      global={template.global_settings}
      composition="standard"
      invitationId="local-lakon-fixture"
      guestName={query.guest}
    />
  );
}

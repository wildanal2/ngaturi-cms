"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarPlus,
  ChevronDown,
  MailOpen,
  MapPin,
  RotateCw,
} from "lucide-react";
import type { SectionRenderProps } from "../types";
import { useLoadingPhase } from "../loading/context";
import { normalizeEventDetails } from "../events/event-data";
import {
  dateLabel,
  externalUrl,
  hasLakonContent,
  lakonCalendarUrl,
  lakonTimeRange,
  record,
  records,
  splitNames,
  targetTimestamp,
  text,
} from "./data";
import { Entrance, useLakon } from "./presentation";
import {
  Action,
  Corners,
  Flourish,
  Gunungan,
  Photo,
  Puppet,
  Section,
} from "./primitives";
import styles from "./lakon-kencana.module.css";

export function LoadingLakon({ props, inCanvas }: SectionRenderProps) {
  const phase = useLoadingPhase();
  if (!inCanvas && phase === "complete") return null;
  return (
    <div
      className={`${styles.loading} ${inCanvas ? styles.loadingCanvas : ""}`}
      data-loading-screen
      data-loading-phase={phase}
      role="status"
      tabIndex={-1}
      aria-live="polite"
    >
      <Gunungan />
      <p>{text(props.message, "Mempersiapkan pahargyan…")}</p>
      <span className={styles.loadingLine} aria-hidden="true" />
    </div>
  );
}

export function CoverLakon({ props, guestName, inCanvas }: SectionRenderProps) {
  const { stage, enter, primary } = useLakon();
  const phase = useLoadingPhase();
  const ref = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState(0);
  const names = text(props.names, "Nama Mempelai");
  const pieces = splitNames(names);
  const loading = phase !== "complete" && !inCanvas;
  const busy = stage !== "closed" || loading;
  useEffect(() => {
    if (inCanvas || stage !== "closed" || loading) return;
    // Run after the shared loading boundary's generic first-control handoff.
    const frame = requestAnimationFrame(() =>
      cta.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [inCanvas, stage, loading]);
  return (
    <div
      ref={ref}
      className={`${styles.cover} ${inCanvas ? styles.coverCanvas : ""}`}
      data-lakon-cover
      data-invitation-cover={inCanvas ? undefined : true}
      data-open={stage === "opened" ? "1" : "0"}
      data-opening={stage === "opening" || undefined}
      hidden={!inCanvas && stage === "opened"}
      role={inCanvas ? undefined : "dialog"}
      aria-modal={inCanvas ? undefined : true}
      aria-label="Undangan pernikahan"
      onKeyDown={(e) => {
        if (e.key !== "Tab" || inCanvas) return;
        const buttons = [
          ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={styles.coverPaper}>
        <Corners />
        <header className={styles.coverHeading}>
          <p className={styles.eyebrow}>{text(props.tagline)}</p>
          <h1 className={styles.coverNames}>
            {pieces.map((name, i) => (
              <span key={i}>
                {i > 0 && <em>&amp;</em>}
                {name}
              </span>
            ))}
          </h1>
          <Flourish />
          {primary && (
            <p className={styles.coverDate}>{dateLabel(primary.date)}</p>
          )}
        </header>
        <div className={styles.coverArt}>
          <div className={styles.coverShadows}>
            <Puppet />
            <Puppet female />
          </div>
          <button
            type="button"
            className={styles.dragGunungan}
            aria-label="Buka dengan gunungan, atau geser ke atas"
            disabled={!!inCanvas || busy}
            onClick={enter}
            style={{ "--lk-drag": `${drag}px` } as CSSProperties}
            onPointerDown={(e) => {
              if (!e.isPrimary || busy) return;
              start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (start.current?.id === e.pointerId)
                setDrag(
                  Math.min(12, Math.max(-150, e.clientY - start.current.y)),
                );
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(0);
            }}
            onPointerUp={(e) => {
              const from = start.current;
              start.current = null;
              setDrag(0);
              if (
                from &&
                (e.clientY - from.y < -60 || Math.abs(e.clientX - from.x) > 90)
              )
                enter();
            }}
          >
            <Gunungan />
          </button>
        </div>
        <div className={styles.recipient}>
          <p>{text(props.note, "Kepada Yth. Bapak/Ibu/Saudara/i")}</p>
          <strong>
            {guestName?.trim() ||
              text(props.recipient_fallback, "Tamu Undangan")}
          </strong>
        </div>
      </div>
      <footer className={styles.coverFooter}>
        <button
          ref={cta}
          type="button"
          className={styles.button}
          onClick={enter}
          disabled={!!inCanvas || busy}
        >
          <MailOpen size={17} aria-hidden="true" />
          {text(props.button_label, "Buka Undangan")}
        </button>
        <span>{text(props.gesture_label, "atau geser gunungan ke atas")}</span>
      </footer>
    </div>
  );
}

export function HeroLakon({ props }: SectionRenderProps) {
  const { primary } = useLakon();
  const names = text(props.couple_names, "Nama Mempelai");
  const pieces = splitNames(names);
  const date = primary?.date || text(props.event_date);
  return (
    <Section type="hero" className={styles.hero}>
      <Entrance>
        <p className={styles.heroWelcome}>
          {text(props.tagline, "Sugeng Rawuh")}
        </p>
        <p className={styles.eyebrow}>
          {text(props.subtitle, "DENGAN SEGENAP CINTA & DOA")}
        </p>
      </Entrance>
      <div className={styles.heroLayout}>
        <div className={styles.heroSide} aria-hidden="true">
          <Entrance className={styles.heroSideName}>
            {pieces.length === 2 ? pieces[0] : ""}
          </Entrance>
          <Puppet parallax={12} />
        </div>
        <Entrance className={styles.heroPortrait} stagger>
          <Flourish className={styles.heroCrown} />
          <Photo
            src={props.background_image || props.couple_image}
            alt={`Potret ${names}`}
            eager
            reveal
            position={text(props.photo_position, "50% 40%")}
          />
          <h1 className={styles.heroNames} tabIndex={-1}>
            {pieces.map((name, i) => (
              <span key={i} data-lakon-reveal-item>
                {i > 0 && <em>&amp;</em>}
                {name}
              </span>
            ))}
          </h1>
        </Entrance>
        <div className={styles.heroSide} aria-hidden="true">
          <Entrance className={styles.heroSideName} delay={90}>
            {pieces.length === 2 ? pieces[1] : ""}
          </Entrance>
          <Puppet female parallax={-12} />
        </div>
      </div>
      <Entrance className={styles.heroDetails} stagger delay={90}>
        <Flourish />
        <time dateTime={date} data-lakon-reveal-item>
          {dateLabel(date)}
        </time>
        {primary?.venue_name && (
          <p data-lakon-reveal-item>{primary.venue_name}</p>
        )}
        <ArrowDown size={18} aria-hidden="true" />
      </Entrance>
    </Section>
  );
}

function PersonCard({
  person,
  female,
}: {
  person: Record<string, unknown>;
  female?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const name = text(person.full_name) || text(person.name);
  const handle = text(person.instagram).replace(/^@/, "");
  if (!name) return null;
  return (
    <Entrance delay={female ? 90 : 0}>
      <button
        type="button"
        className={styles.personCard}
        aria-label={`${flipped ? "Tutup" : "Kenali"} ${name}`}
        aria-pressed={flipped}
        onClick={() => setFlipped(!flipped)}
      >
        <span className={styles.flipInner} data-flipped={flipped || undefined}>
          <span
            className={`${styles.cardFace} ${styles.cardFront}`}
            aria-hidden={flipped}
          >
            <span className={styles.puppetPortrait}>
              <Puppet female={female} />
            </span>
            <span className={styles.cardCaption}>
              <strong>{text(person.name) || name}</strong>
              <span>
                <RotateCw size={13} aria-hidden="true" /> Ketuk untuk mengenal
              </span>
            </span>
          </span>
          <span
            className={`${styles.cardFace} ${styles.cardBack}`}
            aria-hidden={!flipped}
          >
            <Photo src={person.photo} alt={name} />
            <span className={styles.personDetails}>
              <strong>{name}</strong>
              {text(person.child_order) && (
                <span>{text(person.child_order)}</span>
              )}
              {text(person.parents) && <span>{text(person.parents)}</span>}
              {text(person.bio) && <span>{text(person.bio)}</span>}
              {text(person.residence) && (
                <small>{text(person.residence)}</small>
              )}
            </span>
          </span>
        </span>
      </button>
      {/^[\w.]{1,30}$/.test(handle) && (
        <a
          className={styles.social}
          href={`https://www.instagram.com/${handle}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      )}
    </Entrance>
  );
}
export function CoupleLakon({ props }: SectionRenderProps) {
  if (!hasLakonContent("couple-intro", props)) return null;
  return (
    <Section
      type="couple-intro"
      title={text(props.title, "Sepasang Mempelai")}
      eyebrow={text(props.eyebrow, "TEMANTEN")}
      intro={text(props.intro)}
    >
      <div className={styles.coupleGrid}>
        <PersonCard person={record(props.groom)} />
        <PersonCard person={record(props.bride)} female />
      </div>
    </Section>
  );
}
export function QuoteLakon({ props }: SectionRenderProps) {
  if (!text(props.text)) return null;
  return (
    <Section type="quote" dark>
      <Entrance>
        <blockquote className={styles.quote}>
          <Flourish />
          <p>{text(props.text)}</p>
          {text(props.source) && <cite>{text(props.source)}</cite>}
        </blockquote>
      </Entrance>
    </Section>
  );
}
export function StoryLakon({ props }: SectionRenderProps) {
  if (!hasLakonContent("story", props)) return null;
  const items = records(props.items).filter(
    (i) => text(i.title) || text(i.description),
  );
  return (
    <Section
      type="story"
      title={text(props.title, "Lakon Kita")}
      eyebrow={text(props.eyebrow, "SERAT KENANGAN")}
      intro={text(props.intro)}
      dark
    >
      <div className={styles.storyList}>
        {items.map((item, i) => (
          <Entrance key={i}>
            <article className={styles.storyItem}>
              <div className={styles.storyImage}>
                {text(item.image) ? (
                  <Photo src={item.image} alt={text(item.title)} />
                ) : (
                  <Gunungan />
                )}
                <span className={styles.chapterNo} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className={styles.storyText}>
                <p className={styles.eyebrow}>
                  BABAK {String(i + 1).padStart(2, "0")}
                  {text(item.year) ? ` · ${text(item.year)}` : ""}
                </p>
                <h3>{text(item.title)}</h3>
                {text(item.description).length > 150 ? (
                  <>
                    <p className={styles.excerpt}>
                      {text(item.description).slice(0, 120)}…
                    </p>
                    <details>
                      <summary>
                        Baca kisahnya{" "}
                        <ChevronDown size={15} aria-hidden="true" />
                      </summary>
                      <p>{text(item.description)}</p>
                    </details>
                  </>
                ) : (
                  <p>{text(item.description)}</p>
                )}
              </div>
            </article>
          </Entrance>
        ))}
      </div>
    </Section>
  );
}
export function EventsLakon({ props }: SectionRenderProps) {
  const events = normalizeEventDetails(props.events);
  if (!events.length) return null;
  return (
    <Section
      type="event-details"
      title={text(props.title, "Pahargyan")}
      eyebrow={text(props.eyebrow, "WAKTU & TEMPAT")}
      intro={text(props.intro)}
    >
      <div className={styles.eventGrid}>
        {events.map((event, i) => (
          <Entrance key={i} delay={(i % 2) * 90}>
            <article className={styles.eventCard}>
              <span className={styles.eventNumber}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <Flourish />
              <h3>{event.name}</h3>
              <time dateTime={event.date}>{dateLabel(event.date)}</time>
              {event.start_time && (
                <p className={styles.eventTime}>
                  {lakonTimeRange(event.start_time, event.end_time)}
                </p>
              )}
              <div className={styles.rule} />
              <h4>{event.venue_name}</h4>
              {event.address && <p>{event.address}</p>}
              <div className={styles.actions}>
                {externalUrl(event.maps_url) && (
                  <Action href={externalUrl(event.maps_url)}>
                    <MapPin size={16} aria-hidden="true" /> Buka Peta
                  </Action>
                )}
                {event.start_time &&
                  event.end_time &&
                  targetTimestamp(event.date, event.end_time) >
                    targetTimestamp(event.date, event.start_time) && (
                    <Action href={lakonCalendarUrl(event)} secondary>
                      <CalendarPlus size={16} aria-hidden="true" /> Simpan
                      Tanggal
                    </Action>
                  )}
              </div>
            </article>
          </Entrance>
        ))}
      </div>
    </Section>
  );
}
export function MapLakon({ props }: SectionRenderProps) {
  const [show, setShow] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!hasLakonContent("map-location", props)) return null;
  const href = externalUrl(props.maps_url);
  const embed = externalUrl(props.embed_url);
  let allowed = false;
  if (embed) {
    const url = new URL(embed);
    allowed =
      [
        "www.google.com",
        "maps.google.com",
        "maps.google.co.id",
        "www.google.co.id",
      ].includes(url.hostname) && url.pathname.startsWith("/maps");
  }
  return (
    <Section
      type="map-location"
      title={text(props.title, "Papan Panggonan")}
      eyebrow={text(props.eyebrow, "ARAH LOKASI")}
      intro={text(props.intro)}
    >
      <div className={styles.location}>
        <MapPin size={28} aria-hidden="true" />
        <h3>{text(props.venue_name)}</h3>
        <p>{text(props.address)}</p>
        <div className={styles.actions}>
          {href && (
            <Action href={href}>
              Buka Peta <ArrowUpRight size={16} aria-hidden="true" />
            </Action>
          )}
          {allowed && !show && (
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShow(true)}
            >
              Tampilkan Peta
            </button>
          )}
        </div>
        {show && allowed && !failed && (
          <iframe
            title={`Peta ${text(props.venue_name, "lokasi acara")}`}
            src={embed}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}{" "}
        {failed && (
          <p role="status">Peta belum dapat dimuat. Gunakan tautan lokasi.</p>
        )}
      </div>
    </Section>
  );
}

function useMinutes(
  target: number,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !Number.isFinite(target)) return;
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(Date.now());
    const sync = () => {
      clearInterval(timer);
      if (visible && !document.hidden) {
        tick();
        timer = setInterval(tick, 15000);
      }
    };
    let observer: IntersectionObserver | undefined;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
          sync();
        },
        {
          root: node.closest<HTMLElement>("[data-device-scroller]"),
          rootMargin: "200px",
        },
      );
      observer.observe(node);
    } catch {
      // A missing observer must not take the readable invitation down with it.
      observer?.disconnect();
      visible = true;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [target, ref]);
  const remaining = now === null ? null : Math.max(0, target - now);
  return remaining === null
    ? null
    : {
        days: Math.floor(remaining / 86400000),
        hours: Math.floor(remaining / 3600000) % 24,
        minutes: Math.floor(remaining / 60000) % 60,
        done: remaining === 0,
      };
}
export function CountdownLakon({ props, inCanvas }: SectionRenderProps) {
  const { primary } = useLakon();
  const ref = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const [tone, setTone] = useState(false);
  const [soundFailed, setSoundFailed] = useState(false);
  const target = targetTimestamp(
    primary?.date || text(props.target_date),
    primary?.start_time,
  );
  const remaining = useMinutes(target, ref);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  const strike = (index: number) => {
    if (!tone || inCanvas || document.hidden) return;
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      void context
        .resume()
        .then(() => {
          const osc = context.createOscillator(),
            gain = context.createGain();
          osc.type = "sine";
          osc.frequency.value = [
            261.63, 293.66, 329.63, 392, 440, 523.25, 587.33,
          ][index];
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.16,
            context.currentTime + 0.012,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.8,
          );
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start();
          osc.stop(context.currentTime + 0.85);
        })
        .catch(() => setSoundFailed(true));
    } catch {
      setSoundFailed(true);
    }
  };
  if (!Number.isFinite(target)) return null;
  const digits = remaining
    ? [remaining.days, remaining.hours, remaining.minutes]
    : ["—", "—", "—"];
  return (
    <Section
      type="countdown"
      title={text(props.title, "Wanci Bahagia")}
      eyebrow={text(props.eyebrow, "MENGHITUNG HARI")}
      intro={text(props.intro)}
      dark
    >
      <div ref={ref} className={styles.countdown}>
        <div
          className={styles.saron}
          aria-label={
            remaining
              ? `${remaining.days} hari, ${remaining.hours} jam, ${remaining.minutes} menit`
              : "Menghitung waktu acara"
          }
        >
          {Array.from({ length: 7 }, (_, i) => (
            <button
              type="button"
              key={i}
              className={styles.saronKey}
              style={{ "--key-i": i } as CSSProperties}
              aria-label={`Bilah saron ${i + 1}`}
              onClick={() => strike(i)}
            >
              <span className={styles.rivet} />
              <span className={styles.keyValue}>
                {i >= 2 && i <= 4 ? digits[i - 2] : "·"}
              </span>
              <span className={styles.rivet} />
            </button>
          ))}
        </div>
        <div className={styles.units}>
          <span>Hari</span>
          <span>Jam</span>
          <span>Menit</span>
        </div>
        {remaining?.done ? (
          <p role="status">
            {text(props.message_expired, "Hari bahagia telah tiba")}
          </p>
        ) : (
          <p>{dateLabel(primary?.date || text(props.target_date))}</p>
        )}
        <button
          type="button"
          className={styles.soundToggle}
          aria-pressed={tone}
          disabled={!!inCanvas}
          onClick={() => setTone(!tone)}
        >
          {tone ? "Matikan nada saron" : "Aktifkan nada saron"}
        </button>
        {soundFailed && (
          <p role="status">Nada tidak tersedia di browser ini.</p>
        )}
      </div>
    </Section>
  );
}
export function ClosingLakon({ props }: SectionRenderProps) {
  return (
    <Section type="closing" dark className={styles.closing}>
      <Entrance>
        <Gunungan />
        <Flourish />
        <p className={styles.eyebrow}>
          {text(props.eyebrow, "KANTHI KATRESNAN")}{" "}
        </p>
        <h2 tabIndex={-1}>{text(props.title, "Matur Nuwun")}</h2>
        <p className={styles.closingMessage}>{text(props.message)}</p>
        {text(props.photo) && (
          <Photo src={props.photo} alt={`Potret ${text(props.names)}`} />
        )}
        <p className={styles.closingNames}>{text(props.names)}</p>
        <Flourish />
      </Entrance>
    </Section>
  );
}

"use client";

import { useEffect, useState } from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string }) => void;
    };
  }
}

/**
 * Renders the Turnstile widget (auto-injects `cf-turnstile-response` into
 * the surrounding <form>). Renders nothing when no site key is configured.
 */
export function TurnstileField() {
  const [siteKey, setSiteKey] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/public-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config: { turnstileSiteKey?: string }) => {
        if (active) setSiteKey(config.turnstileSiteKey ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const id = "cf-turnstile-script";
    function render() {
      const el = document.querySelector<HTMLElement>(".cf-turnstile:empty");
      if (el && window.turnstile) {
        window.turnstile.render(el, { sitekey: siteKey });
      }
    }
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      const s = document.createElement("script");
      s.id = id;
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
      script = s;
    }
    script.addEventListener("load", render);
    render();
    return () => script?.removeEventListener("load", render);
  }, [siteKey]);

  if (!siteKey) return null;
  return <div className="cf-turnstile my-2" />;
}

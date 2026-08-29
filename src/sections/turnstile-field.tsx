"use client";

import { useEffect } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
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
  useEffect(() => {
    if (!SITE_KEY) return;
    const id = "cf-turnstile-script";
    function render() {
      const el = document.querySelector<HTMLElement>(".cf-turnstile:empty");
      if (el && window.turnstile) {
        window.turnstile.render(el, { sitekey: SITE_KEY });
      }
    }
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      render();
    }
  }, []);

  if (!SITE_KEY) return null;
  return <div className="cf-turnstile my-2" />;
}

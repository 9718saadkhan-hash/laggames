import { useEffect, useState } from "react";

import logoAsset from "@/assets/lag-logo.jpg.asset.json";

const KEY = "lag-intro-seen";

/**
 * Cinematic first-visit intro. Shows once per browser session only, and
 * degrades to a short static splash when reduced motion is requested.
 */
export function IntroLoader() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.sessionStorage.getItem(KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShow(true);
    document.documentElement.style.overflow = "hidden";

    const total = reduced ? 700 : 1900;
    const timers: number[] = [
      window.setTimeout(() => setStep(1), reduced ? 0 : 350),
      window.setTimeout(() => setStep(2), reduced ? 0 : 800),
      window.setTimeout(() => setStep(3), reduced ? 0 : 1150),
      window.setTimeout(() => setLeaving(true), total - 400),
      window.setTimeout(() => {
        setShow(false);
        document.documentElement.style.overflow = "";
        try {
          window.sessionStorage.setItem(KEY, "1");
        } catch {
          /* ignore */
        }
      }, total),
    ];
    return () => {
      timers.forEach(window.clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="LAG LIVE AS GAMERS"
      className={`fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[oklch(0.06_0_0)] transition-all duration-500 ${
        leaving ? "scale-105 opacity-0" : "scale-100 opacity-100"
      }`}
    >
      <div
        aria-hidden
        className="absolute h-72 w-72 rounded-full bg-lag-red/25 blur-[110px] motion-safe:animate-pulse"
        style={{ transform: "translate(-30%, -20%)" }}
      />
      <div
        aria-hidden
        className="absolute h-72 w-72 rounded-full bg-lag-blue/25 blur-[110px] motion-safe:animate-pulse"
        style={{ transform: "translate(30%, 20%)" }}
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <img
          src={logoAsset.url}
          alt=""
          width={120}
          height={120}
          className="h-24 w-24 rounded-3xl object-cover ring-1 ring-white/15 transition-all duration-700 ease-out sm:h-28 sm:w-28"
          style={{
            filter: step >= 1 ? "blur(0px)" : "blur(14px)",
            transform: step >= 1 ? "scale(1)" : "scale(0.86)",
            opacity: step >= 1 ? 1 : 0.4,
          }}
        />
        <p
          className="mt-6 font-display text-4xl font-bold tracking-tight transition-all duration-500 sm:text-5xl"
          style={{ opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? "none" : "translateY(10px)" }}
        >
          <span className="text-lag-red">L</span>
          <span className="text-lag-blue">AG</span>
        </p>
        <p
          className="mt-2 text-[11px] font-bold tracking-[0.42em] text-white/70 transition-all duration-500"
          style={{ opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "none" : "translateY(8px)" }}
        >
          LIVE AS GAMERS
        </p>
      </div>
    </div>
  );
}

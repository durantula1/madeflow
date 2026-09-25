"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";

const RevisionStackScene = dynamic(() => import("./revision-stack-scene"), {
  ssr: false,
  loading: () => null,
});

/** Contain WebGL failures so they cannot break the landing page. */
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/**
 * Hero visual: a WebGL stack of revisions on large screens with motion allowed,
 * without a static stand-in while the scene chunk loads.
 */
export function RevisionStack() {
  const reduceMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  // three.js is ~600 KB of script: start it only once the page has loaded and the main thread
  // is idle, so it never competes with the headline paint or the first interactions.
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let handle = 0;
    const start = () => {
      // Safari has no requestIdleCallback.
      handle = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => setIdle(true), { timeout: 3000 })
        : window.setTimeout(() => setIdle(true), 1500) as number;
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(handle);
      window.clearTimeout(handle);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(width >= 64rem)");
    const update = () => {
      const canUseScene = !reduceMotion && query.matches && supportsWebGL();
      setAllowed(canUseScene);
      if (!canUseScene) setReady(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduceMotion]);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showScene = allowed && idle && !reduceMotion;

  return (
    <>
      <div
        ref={container}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-3vw] top-[18vh] z-10 hidden h-[68vh] w-[42vw] lg:block xl:right-[-2vw] xl:w-[min(40vw,38rem)]"
      >
        {showScene && (
          <SceneBoundary onError={() => setAllowed(false)}>
            <m.div
              className="size-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            >
              <RevisionStackScene
                active={visible}
                onReady={() => setReady(true)}
              />
            </m.div>
          </SceneBoundary>
        )}
      </div>
    </>
  );
}

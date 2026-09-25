"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

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

  const showScene = allowed && !reduceMotion;

  return (
    <>
      <div
        ref={container}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-5vw] top-[-4vh] z-10 hidden h-[86vh] w-[58vw] lg:block xl:right-[-6vw] xl:w-[min(56vw,53.75rem)]"
      >
        {showScene && (
          <SceneBoundary onError={() => setAllowed(false)}>
            <motion.div
              className="size-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            >
              <RevisionStackScene
                active={visible}
                onReady={() => setReady(true)}
              />
            </motion.div>
          </SceneBoundary>
        )}
      </div>
    </>
  );
}

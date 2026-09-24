"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Eraser, Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Finger / mouse / stylus signature. Emits a PNG data URL (or "" when empty) through `onChange`.
 * The canvas is resized to its box and the device pixel ratio; a resize clears it, so the client signs again.
 */
export function SignatureField({ onChange, disabled }: { onChange: (dataUrl: string) => void; disabled?: boolean }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [value, setValue] = useState("");
  // A signature drawn in the full-screen pad is shown back as an image, since that canvas is gone.
  const [fromFullscreen, setFromFullscreen] = useState(false);
  const [cleared, setCleared] = useState(false);

  const update = useCallback((dataUrl: string) => {
    setValue(dataUrl);
    onChange(dataUrl);
  }, [onChange]);
  const clear = () => { setFromFullscreen(false); update(""); };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Подпис</span>
        {!disabled ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2" onPress={() => { update(""); setFullscreen(true); }}>
            <Maximize2 className="size-4" /> На цял екран
          </Button>
        ) : null}
      </div>
      {fromFullscreen && value ? (
        <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img src={value} alt="Твоят подпис" className="max-h-full max-w-full object-contain" />
          {!disabled ? <Button type="button" variant="outline" size="sm" className="absolute right-2 top-2 h-9 gap-1.5 bg-white px-2.5 text-zinc-700" onPress={clear}><Eraser className="size-4" /> Изчисти</Button> : null}
        </div>
      ) : !fullscreen ? (
        <Pad key="inline" onChange={update} onResized={() => setCleared(true)} disabled={disabled} className="h-[40vh] max-h-64 min-h-44" />
      ) : null}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {cleared && !value ? "Размерът на екрана се промени — подпиши се отново." : "Подпиши се с пръст, мишка или писалка."}
      </p>
      {fullscreen ? (
        <div role="dialog" aria-modal="true" aria-label="Подпис на цял екран" className="fixed inset-0 z-50 flex flex-col bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-semibold">Подпиши се в полето</p>
            <Button type="button" variant="ghost" size="icon" aria-label="Затвори" className="size-11" onPress={() => { setFullscreen(false); clear(); }}><X /></Button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground sm:hidden">Завърти телефона хоризонтално за повече място.</p>
          <Pad key="fullscreen" onChange={update} onResized={() => setCleared(true)} className="min-h-0 flex-1" />
          <Button type="button" className="mt-3 h-12 w-full text-base" isDisabled={!value} onPress={() => { setFromFullscreen(true); setFullscreen(false); }}>Готово</Button>
        </div>
      ) : null}
    </div>
  );
}

function Pad({ onChange, onResized, disabled, className }: { onChange: (dataUrl: string) => void; onResized: () => void; disabled?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const callbacks = useRef({ onChange, onResized });
  const [empty, setEmpty] = useState(true);
  useEffect(() => { callbacks.current = { onChange, onResized }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, { penColor: "#18181b", minWidth: 0.8, maxWidth: 2.6, backgroundColor: "rgba(0,0,0,0)" });
    padRef.current = pad;
    const emit = () => {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      callbacks.current.onChange(isEmpty ? "" : pad.toDataURL("image/png"));
    };
    pad.addEventListener("endStroke", emit);
    let lastSize = "";
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const size = `${canvas.offsetWidth}x${canvas.offsetHeight}x${ratio}`;
      if (size === lastSize) return;
      const hadInk = !pad.isEmpty();
      lastSize = size;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      if (hadInk) callbacks.current.onResized();
      emit();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    if (disabled) pad.off(); else pad.on();
  }, [disabled]);

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-dashed bg-white ${disabled ? "opacity-70" : ""} ${className ?? ""}`}>
      <canvas ref={canvasRef} aria-label="Поле за подпис" className="absolute inset-0 size-full touch-none select-none" />
      {empty ? <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-zinc-300 pb-1 text-xs text-zinc-400">Подпиши се тук</span> : null}
      {!empty && !disabled ? (
        <Button type="button" variant="outline" size="sm" className="absolute right-2 top-2 h-9 gap-1.5 bg-white px-2.5 text-zinc-700" onPress={() => { padRef.current?.clear(); setEmpty(true); callbacks.current.onChange(""); }}>
          <Eraser className="size-4" /> Изчисти
        </Button>
      ) : null}
    </div>
  );
}

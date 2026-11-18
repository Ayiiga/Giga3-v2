"use client";

import { Button } from "@/components/ui/Button";
import { SIGNATURE_CANVAS, signatureImageBytes } from "@/lib/documents/signature";
import { PenLine } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

type Point = { x: number; y: number };

export function DocumentSignature({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (signature?: string) => void;
  disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ pointer: number; point: Point } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState("");

  function pointAt(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * SIGNATURE_CANVAS.width / bounds.width,
      y: (event.clientY - bounds.top) * SIGNATURE_CANVAS.height / bounds.height,
    };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || stroke.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = pointAt(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    stroke.current = { pointer: event.pointerId, point };
    ctx.fillStyle = "#18243b";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    setHasInk(true);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    const previous = stroke.current;
    if (disabled || !previous || previous.pointer !== event.pointerId) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const next = pointAt(event);
    ctx.strokeStyle = "#18243b";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previous.point.x, previous.point.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    stroke.current = { pointer: event.pointerId, point: next };
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (stroke.current?.pointer === event.pointerId) stroke.current = null;
  }

  function close() {
    stroke.current = null;
    setHasInk(false);
    setError("");
    setDrawing(false);
  }

  function apply() {
    if (!canvas.current || !hasInk || disabled) return;
    try {
      const signature = canvas.current.toDataURL("image/png");
      signatureImageBytes(signature);
      onChange(signature);
      close();
    } catch {
      setError("Could not save the signature. Clear the pad and draw it again.");
    }
  }

  return (
    <section aria-label="Document signature" className="space-y-3 rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Signature</h3>
        {!drawing ? (
          <Button type="button" size="sm" variant="secondary" disabled={disabled}
            onClick={() => { setError(""); setDrawing(true); }}>
            <PenLine className="h-4 w-4" aria-hidden /> {value ? "Replace signature" : "Sign document"}
          </Button>
        ) : null}
      </div>
      {drawing ? (
        <>
          <p className="text-sm text-slate-600">Draw your signature with your finger, stylus, or mouse.</p>
          <canvas ref={canvas} width={SIGNATURE_CANVAS.width} height={SIGNATURE_CANVAS.height}
            aria-label="Handwritten signature pad"
            className="block h-auto w-full touch-none rounded-xl border border-dashed border-slate-400 bg-slate-50"
            onPointerDown={start} onPointerMove={draw} onPointerUp={end}
            onPointerCancel={end} onLostPointerCapture={end} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={!hasInk || disabled} onClick={apply}>Apply signature</Button>
            <Button type="button" size="sm" variant="secondary" disabled={!hasInk}
              onClick={() => {
                const ctx = canvas.current?.getContext("2d");
                ctx?.clearRect(0, 0, SIGNATURE_CANVAS.width, SIGNATURE_CANVAS.height);
                setHasInk(false);
                setError("");
              }}>Clear</Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>Cancel</Button>
          </div>
          {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
        </>
      ) : value ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Included at the end of PDF and Word exports.</span>
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(undefined)}>Remove signature</Button>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn } from "lucide-react";

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "Bebas", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

export interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CropDialog({
  src,
  initialAspect,
  onCancel,
  onConfirm,
  extraAction,
}: {
  src: string;
  initialAspect?: number;
  onCancel: () => void;
  onConfirm: (crop: CropResult) => void;
  extraAction?: { label: string; onClick: () => void };
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [pixels, setPixels] = useState<Area | null>(null);

  const onComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-sm font-medium">Atur foto</span>
          <button onClick={onCancel} className="text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 bg-ink">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
            restrictPosition={false}
          />
        </div>

        <div className="space-y-3 border-t border-line p-4">
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                onClick={() => setAspect(a.value)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  aspect === a.value
                    ? "border-forest bg-forest text-cream"
                    : "border-line hover:bg-cream-200"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ZoomIn size={15} className="text-muted" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-forest"
            />
          </div>
          <div className="flex justify-end gap-2">
            {extraAction ? (
              <button
                onClick={extraAction.onClick}
                className="mr-auto rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft"
              >
                {extraAction.label}
              </button>
            ) : null}
            <button
              onClick={onCancel}
              className="rounded-full border border-line px-4 py-1.5 text-sm"
            >
              Batal
            </button>
            <button
              onClick={() =>
                pixels &&
                onConfirm({
                  x: Math.round(pixels.x),
                  y: Math.round(pixels.y),
                  width: Math.round(pixels.width),
                  height: Math.round(pixels.height),
                })
              }
              className="rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-cream"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

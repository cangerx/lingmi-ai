"use client";

/**
 * Client-side image editing utilities: rotate, flip, crop.
 * Uses canvas API — no backend calls needed.
 */

export type QuickEditAction = "rotate-cw" | "rotate-ccw" | "flip-h" | "flip-v";

/** Rotate or flip an image via canvas API, returns a data URL */
export async function applyQuickEdit(src: string, action: QuickEditAction): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const isRotate = action === "rotate-cw" || action === "rotate-ccw";
      const w = isRotate ? img.naturalHeight : img.naturalWidth;
      const h = isRotate ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No context");

      ctx.save();

      if (action === "rotate-cw") {
        ctx.translate(w, 0);
        ctx.rotate(Math.PI / 2);
      } else if (action === "rotate-ccw") {
        ctx.translate(0, h);
        ctx.rotate(-Math.PI / 2);
      } else if (action === "flip-h") {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      } else if (action === "flip-v") {
        ctx.translate(0, h);
        ctx.scale(1, -1);
      }

      ctx.drawImage(img, 0, 0);
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject("Failed to load image");
    img.src = src;
  });
}

/** Crop an image to a given rect, returns a data URL */
export async function cropImage(
  src: string,
  rect: { x: number; y: number; w: number; h: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = rect.w;
      canvas.height = rect.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No context");
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject("Failed to load image");
    img.src = src;
  });
}

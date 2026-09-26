/**
 * How big a company logo is drawn, shared by the web pages and the PDF so both show the same proportion.
 *
 * Logos are sized by area, not by height (the rule logo walls use): a wide word mark gets lower and
 * longer, a square emblem taller, and both carry the same visual weight. A fixed height made square
 * logos with fine text look tiny.
 */

export const LOGO_SIZES = ["small", "medium", "large"] as const;
export type LogoSize = (typeof LOGO_SIZES)[number];
export type LogoDimensions = { width: number; height: number };

/** What a page needs to draw a logo: its URL, its pixel size when known, and the company's size choice. */
export type DocumentLogo = { url: string; dimensions: LogoDimensions | null; size: LogoSize };

export const logoSizeLabels: Record<LogoSize, string> = { small: "Малко", medium: "Стандартно", large: "Голямо" };

/** All in PDF points. MAX_WIDTH keeps even a very long word mark within about 40% of the text width. */
const AREA = 5000;
const AREA_FACTOR: Record<LogoSize, number> = { small: 0.6, medium: 1, large: 1.6 };
const MIN_HEIGHT = 22;
const MAX_HEIGHT: Record<LogoSize, number> = { small: 52, medium: 64, large: 80 };
const MAX_WIDTH = 210;

/** Box in points for a logo of the given pixel size; only the aspect ratio of `dimensions` matters. */
export function logoBox(dimensions: LogoDimensions, size: LogoSize = "medium") {
  const ratio = dimensions.width / dimensions.height;
  let height = Math.min(Math.max(Math.sqrt((AREA * AREA_FACTOR[size]) / ratio), MIN_HEIGHT), MAX_HEIGHT[size]);
  let width = height * ratio;
  if (width > MAX_WIDTH) {
    width = MAX_WIDTH;
    height = width / ratio;
  }
  return { width: Math.round(width * 10) / 10, height: Math.round(height * 10) / 10 };
}

/** CSS rem for a length in points (1pt = 4/3 px at 96 dpi, 16px root), so the web shows the PDF proportion. */
export function ptToRem(points: number) {
  return `${Math.round((points * 4) / 3 / 16 * 1000) / 1000}rem`;
}

/** Stored logos are named `<org>/<sha256>-<width>x<height>.png`; older files carry no size. */
export function logoDimensionsFromPath(path: string | null | undefined): LogoDimensions | null {
  const match = /-(\d{1,5})x(\d{1,5})\.png$/.exec(path ?? "");
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

export function isLogoSize(value: unknown): value is LogoSize {
  return typeof value === "string" && (LOGO_SIZES as readonly string[]).includes(value);
}

/**
 * Difference from the background that still counts as background: anti-aliased edges, JPEG noise
 * and the faint haze some exports leave across a "transparent" canvas (alpha 1–5%).
 */
const TRIM_THRESHOLD = 12;

/**
 * The part of an RGBA image that is actually logo, as [left, top, width, height]. The background is
 * the top-left pixel: when it is transparent, anything clearly visible counts; otherwise anything
 * whose colour differs from it. Shared by the server (what gets stored) and the settings preview
 * (what the owner sees before saving), so the two always match. The whole image when nothing differs.
 */
export function findContentBox(data: ArrayLike<number>, width: number, height: number): [number, number, number, number] {
  const transparent = data[3]! < 8;
  const [r0, g0, b0, a0] = [data[0]!, data[1]!, data[2]!, data[3]!];
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const content = transparent
        ? data[i + 3]! > TRIM_THRESHOLD
        : Math.abs(data[i]! - r0) > TRIM_THRESHOLD || Math.abs(data[i + 1]! - g0) > TRIM_THRESHOLD
          || Math.abs(data[i + 2]! - b0) > TRIM_THRESHOLD || Math.abs(data[i + 3]! - a0) > TRIM_THRESHOLD;
      if (!content) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? [0, 0, width, height] : [left, top, right - left + 1, bottom - top + 1];
}

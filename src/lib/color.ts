// Colors for the color picker: reading whatever people paste, and writing it back in the format they picked.
// Values are kept as `#rrggbb` (or `#rrggbbaa` with transparency), what the api's color params take.


export interface Rgba {
  r: number,
  g: number,
  b: number,
  // 0-1
  a: number,
}

export interface Hsva {
  // 0-360
  h: number,
  // 0-1
  s: number,
  v: number,
  a: number,
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'int';

export const COLOR_FORMATS: ReadonlyArray<ColorFormat> = ['hex', 'rgb', 'hsl', 'int'];


const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const byte = (value: number) => clamp(Math.round(value), 0, 255);
const hex2 = (value: number) => byte(value).toString(16).padStart(2, '0');


function fromHex(text: string): Rgba | null {
  const digits = text.replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(digits)) {
    return null;
  }
  if (digits.length === 3 || digits.length === 4) {
    const [ r, g, b, a ] = [...digits].map((digit) => parseInt(digit + digit, 16));
    return {r, g, b, a: (a === undefined) ? 1 : a / 255};
  }
  if (digits.length === 6 || digits.length === 8) {
    const a = (digits.length === 8) ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return {r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16), a};
  }
  return null;
}


let context: CanvasRenderingContext2D | null | undefined;

// anything css understands (`rebeccapurple`, `hsl(...)`, `rgb(255 0 0 / 50%)`, `hwb(...)`), read by the browser itself:
// a canvas only takes a fill style it can parse, and hands it back as `#rrggbb` or `rgba(r, g, b, a)`
function fromCss(text: string): Rgba | null {
  if (context === undefined) {
    context = (typeof document === 'undefined') ? null : document.createElement('canvas').getContext('2d');
  }
  if (!context) {
    return null;
  }
  // two different starting values, so a color the canvas ignored is caught even when it equals one of them
  const results = ['#010203', '#040506'].map((start) => {
    context!.fillStyle = start;
    context!.fillStyle = text;
    return String(context!.fillStyle);
  });
  if (results[0] !== results[1]) {
    return null;
  }
  const parsed = results[0];
  if (parsed.startsWith('#')) {
    return fromHex(parsed);
  }
  const match = parsed.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  if (!match) {
    return null;
  }
  return {r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: (match[4] === undefined) ? 1 : Number(match[4])};
}


// What someone typed or pasted: `#f00`, `ff0000`, `#ff000080`, `0xff0000`, `16711680` (a Discord-style number),
// `255, 0, 0` or `255 0 0 / 0.5`, `rgb(...)`, `hsl(...)`, or any css color name. Null when it isn't a color
export function parseColor(input: string): Rgba | null {
  const text = input.trim().replace(/;$/, '').trim();
  if (!text) {
    return null;
  }
  if (text.startsWith('#')) {
    return fromHex(text);
  }
  if (/^0x[0-9a-f]{1,6}$/i.test(text)) {
    const value = parseInt(text.slice(2), 16);
    return {r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 1};
  }
  // a number on its own is a color int (`16711680` is red), like Discord's embed colors
  if (/^\d+$/.test(text)) {
    const value = Number(text);
    if (value > 0xffffff) {
      return null;
    }
    return {r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 1};
  }
  // three or four bare numbers: `255, 0, 0`, `255 0 0`, `255, 0, 0, 0.5`
  const bare = text.match(/^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+%?))?$/);
  if (bare) {
    const [ r, g, b ] = [bare[1], bare[2], bare[3]].map(Number);
    if (255 < r || 255 < g || 255 < b) {
      return null;
    }
    let a = 1;
    if (bare[4] !== undefined) {
      a = (bare[4].endsWith('%')) ? parseFloat(bare[4]) / 100 : Number(bare[4]);
      // `255, 0, 0, 128`: an alpha byte
      if (1 < a) {
        a /= 255;
      }
    }
    return {r, g, b, a: clamp(a, 0, 1)};
  }
  // bare hex without the `#` (`ff0000`), only at hex lengths that aren't also words (`bad`, `face` are names-ish)
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(text)) {
    return fromHex(text);
  }
  return fromCss(text);
}


export function toHex({ r, g, b, a }: Rgba, alpha: boolean): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return (alpha && a < 1) ? `${base}${hex2(a * 255)}` : base;
}


export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const [ rr, gg, bb ] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === rr) {
      h = ((gg - bb) / delta) % 6;
    } else if (max === gg) {
      h = (bb - rr) / delta + 2;
    } else {
      h = (rr - gg) / delta + 4;
    }
    h = (h * 60 + 360) % 360;
  }
  return {h, s: (max) ? delta / max : 0, v: max, a};
}


export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  const [ r, g, b ] = (h < 60) ? [chroma, x, 0] : (h < 120) ? [x, chroma, 0] : (h < 180) ? [0, chroma, x]
    : (h < 240) ? [0, x, chroma] : (h < 300) ? [x, 0, chroma] : [chroma, 0, x];
  return {r: byte((r + m) * 255), g: byte((g + m) * 255), b: byte((b + m) * 255), a};
}


function rgbaToHsl({ r, g, b }: Rgba): [number, number, number] {
  const [ rr, gg, bb ] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const delta = max - min;
  const s = (delta) ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  const { h } = rgbaToHsva({r, g, b, a: 1});
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}


// shown in the format picked, with the transparency when there's some
export function formatColor(rgba: Rgba, format: ColorFormat, alpha: boolean): string {
  const a = Math.round(rgba.a * 100) / 100;
  const transparent = alpha && a < 1;
  switch (format) {
    case 'rgb':
      return (transparent) ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a})` : `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
    case 'hsl': {
      const [ h, s, l ] = rgbaToHsl(rgba);
      return (transparent) ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
    }
    case 'int':
      return String((rgba.r << 16) + (rgba.g << 8) + rgba.b);
    default:
      return toHex(rgba, alpha);
  }
}

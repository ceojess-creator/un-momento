// Shared types for CollageEditor, StickerStudio, and ButtonStudio

export interface SlotData {
  img:          HTMLImageElement | null;
  originalSrc:  string | null;         // for reset
  filter:       string;
  zoom:         number;
  panX:         number;
  panY:         number;
  brightness:   number;
  contrast:     number;
  saturation:   number;
  opacity:      number;
  bgRemovedUrl: string | null;         // sticker/button only
  text:         string;                // sticker slot label
}

export interface Overlay {
  id:         number;
  text:       string;
  type:       'text' | 'emoji';
  x:          number;
  y:          number;
  size:       number;
  color:      string;
  angle:      number;
  opacity:    number;
  fontFamily: string;
  fontBold:   boolean;
  fontItalic: boolean;
}

export interface Shape {
  id:          number;
  kind:        'rect' | 'circle' | 'line';
  x:           number;
  y:           number;
  w:           number;
  h:           number;
  color:       string;
  borderColor: string;
  borderWidth: number;
  opacity:     number;
  angle:       number;
}

export interface EditorState {
  slots:    SlotData[];
  overlays: Overlay[];
  shapes:   Shape[];
  bgColor:  string;
}

export type SnapMode = 'snap' | 'freehand';

export const DEFAULT_SLOT: SlotData = {
  img:          null,
  originalSrc:  null,
  filter:       'none',
  zoom:         1,
  panX:         0,
  panY:         0,
  brightness:   100,
  contrast:     100,
  saturation:   100,
  opacity:      100,
  bgRemovedUrl: null,
  text:         '',
};

export const CLIP_ART = [
  '🎓','📜','⭐','🏆','🎗️','🔥','✨','❤️','🎉','🎊',
  '💫','🌟','👑','🌸','🦋','💪','🎵','🎨','🌈','💎',
  '🦄','🏅','📸','🎁','🌺','🍀',
];

export const CSS_FILTERS: Record<string, string> = {
  none:      'none',
  warm:      'sepia(0.3) saturate(1.4) brightness(1.05)',
  cool:      'saturate(0.8) hue-rotate(20deg)',
  bw:        'grayscale(1)',
  fade:      'brightness(1.1) saturate(0.7)',
  vivid:     'saturate(1.8) contrast(1.1)',
  golden:    'sepia(0.5) saturate(1.6) brightness(1.1)',
  drama:     'contrast(1.4) saturate(1.2) brightness(0.9)',
};

export const FILTER_LABELS: Record<string, string> = {
  none:'Original', warm:'Warm', cool:'Cool', bw:'B&W',
  fade:'Fade', vivid:'Vivid', golden:'Golden', drama:'Drama',
};

export function buildCSSFilter(slot: SlotData): string {
  const parts: string[] = [];
  if (slot.brightness !== 100) parts.push(`brightness(${slot.brightness/100})`);
  if (slot.contrast   !== 100) parts.push(`contrast(${slot.contrast/100})`);
  if (slot.saturation !== 100) parts.push(`saturate(${slot.saturation/100})`);
  if (slot.filter && slot.filter !== 'none') parts.push(slot.filter);
  return parts.length ? parts.join(' ') : 'none';
}

// Print dimensions at 300dpi
export const PRINT_DIMS = {
  photo_landscape: { w: 1800, h: 1200 }, // 4x6 landscape
  photo_portrait:  { w: 1200, h: 1800 }, // 4x6 portrait
  sticker_sheet:   { w: 1260, h: 1890 }, // 4.2x6.3 for Pixcut
  button_56mm:     { w: 661,  h: 661  }, // 56mm circle at 300dpi
  button_50mm_sq:  { w: 591,  h: 591  }, // 50mm square
  button_32mm:     { w: 378,  h: 378  }, // 32mm circle
  magnet_56mm:     { w: 661,  h: 661  },
  magnet_32mm:     { w: 378,  h: 378  },
  keychain_oval:   { w: 472,  h: 354  }, // 40mm oval
  keychain_rect:   { w: 413,  h: 531  }, // 35x45mm rect
};

export const SNAP_THRESHOLD = 14;

export function snapToGrid(
  x: number, y: number, W: number, H: number, mode: SnapMode
): { x: number; y: number; guides: { x?: number; y?: number } } {
  if (mode === 'freehand') return { x, y, guides: {} };

  const guides: { x?: number; y?: number } = {};
  const snapsX = [0, W/4, W/3, W/2, W*2/3, W*3/4, W];
  const snapsY = [0, H/4, H/3, H/2, H*2/3, H*3/4, H];

  let nx = x, ny = y;
  for (const sx of snapsX) {
    if (Math.abs(x - sx) < SNAP_THRESHOLD) { nx = sx; guides.x = sx; break; }
  }
  for (const sy of snapsY) {
    if (Math.abs(y - sy) < SNAP_THRESHOLD) { ny = sy; guides.y = sy; break; }
  }
  return { x: nx, y: ny, guides };
}
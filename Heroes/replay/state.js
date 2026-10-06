export const CELL_W = 52;
export const CELL_H = 52;

export const LANDS_STR = [
  'grass', 'autumn', 'swamp', 'dirt', 'desert', 'beach', 'lava', 'necr',
  'night', 'snow', 'spring', 'tajga', 'cave', 'ng', 'road', 'fleurs',
  'heath', 'mist', 'geysir', 'crypt', 'conflux', 'dragon', 'magi', 'thicket',
  'treasure', '2ship', 'necrship', 'arena1', 'arena2', 'arena3', 'trail',
  'necrotrail', 'ereb', '3ship', 'arena8', 'monk', 'barb', 'pit', 'castle',
  'bridge', '2bridges', 'egypt', 'gnomos', 'ship', 'bridge2', 'mech',
  'ship2beach', 'desp', 'grib', 'beach2ship', 'cloud', 'oasis', 'dark',
  'ice', 'pebbles', 'dun1', 'dun2', 'dun3', 'dun2', 'ash', 'moss', 'neft',
  'cave2ship', 'ship2cave', 'red', 'bambuk', '3ship2', 'snowspring',
  'darksnow', 'grass2ship', 'ship2grass', 'wooden',
];

export const LAND_COLORS = {
  land_grass: ['#5a8040', '#4a7030', '#6a9050', '#587838', '#609848', '#4c7c34', '#547c3c', '#5c8844'],
  land_autumn: ['#8a6a30', '#9a7a40', '#7a5a20', '#8a6a38', '#9a7a48', '#7a5a28'],
  land_swamp: ['#4a6a30', '#3a5a20', '#5a7a40', '#4a6a38', '#3a5a28', '#5a7a48'],
  land_dirt: ['#8a7a50', '#7a6a40', '#9a8a60', '#8a7a58', '#7a6a48', '#9a8a68', '#6a5a38'],
  land_desert: ['#c0a060', '#b09050', '#d0b070', '#c8a868', '#b89858', '#d4b474'],
  land_snow: ['#b0c0d0', '#a0b0c0', '#c0d0e0', '#b8c8d8', '#a8b8c8', '#c4d4e4'],
  default: ['#5a8040', '#4a7030', '#6a9050', '#587838', '#609848'],
};

export const state = {
  konvaStage: null,
  bgLayer: null,
  terrainLayer: null,
  creatureLayer: null,
  overlayLayer: null,
  battle: null,
  hoveredHex: null,
  replayIndex: 0,
  replayActions: [],
  replayTimer: null,
  replayTween: null,
  replayMove: null,
  replayAnimating: false,
  paused: false,
  speedIdx: 1,
  speeds: [0.5, 1, 2],
  imgCache: new Map(),
  animCache: new Map(),
  bgImageRef: null,
  gridGroup: null,
  walls: null,
};

window.sounds = window.sounds || {};
window.postloader = window.postloader || { loading: false };
window.portrait = window.portrait || {};
window.bvs = window.bvs || {};
window.eval('var sounds = window.sounds; var postloader = window.postloader; var portrait = window.portrait; var bvs = window.bvs;');

export function parsePoleParams(s) {
  const r = {};
  const p = s.split('|');
  for (let i = 0; i < p.length - 1; i += 2) {
    if (p[i]) r[p[i]] = p[i + 1];
  }
  r._defxn = parseInt(r.defxn, 10) || 12;
  r._defyn = parseInt(r.defyn, 10) || 12;
  r._warid = parseInt(r.warid, 10) || 0;
  r._gtype = parseInt(r.gtype, 10) || 1;
  r._btype = parseInt(r.btype, 10) || 0;
  return r;
}

export function parseUmka(s) {
  const m = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15 };
  const r = [];
  for (let i = 0; i < s.length && i < 28; i += 1) r.push(m[s[i]] || 0);
  return r;
}

function landconvert(g) {
  const map = {
    1: 100, 2: 109, 4: 112, 5: 103, 6: 108, 7: 106,
    8: 104, 9: 107, 10: 111, 11: 105, 12: 102,
    14: 300, 15: 110, 16: 100, 17: 104, 18: 101,
    23: 127, 27: 113, 31: 125, 3: 127,
  };
  let vl = map[g];
  if (vl === undefined) vl = g < 100 ? 100 : g;
  if (vl >= 100 && vl < 300) return LANDS_STR[vl - 100] || 'grass';
  if (vl >= 300) return 'arena_tnv';
  return 'grass';
}

export function getLandId(g) {
  return `land_${landconvert(g)}`;
}

export function getCellColor(x, y, lid) {
  const c = LAND_COLORS[lid] || LAND_COLORS.default;
  return c[(x * 7 + y * 13) % c.length];
}

export function terrainSeed(w, x, y) {
  return ((w % 17417) * (x + 1) * 31 + (y + 1) * 37) % 100;
}

export function getLandImageUrl(lid, warid) {
  const t = ((warid + 2000) * 10001 + 3) % 17417;
  const r = Math.abs(t) / 17417;
  const landsCount = 15;
  const variant = Math.floor(r * landsCount) % landsCount + 1;
  return `https://dcdn.heroeswm.ru/i/png40/lands/${lid}${variant}.jpg`;
}

export function cellToPixel(col, row, pd, defxn, defyn) {
  const a = getxa(col, row, pd, defxn, defyn);
  return { x: a.xc, y: a.yc };
}

// Original game perspective constants
export const POLE_LEFT = 20;
export const POLE_RIGHT = 20;
export const POLE_TOP = 130;
export const POLE_BOTTOM = 136;
export const TOP_SIZE_DEF = 0.65;
export const POLE_WIDTH_HEIGHT_DIV = 0.2;
export const POLE_WIDTH_HEIGHT_DIV_DYNAMIC = 0.35;
export const POLE_TOP_DEF = POLE_TOP;
export const ORIGINAL_WIDTH = 1920;
export const SCR_LEFT = 0;
export const SCR_RIGHT = 0;
export const SCR_TOP = 0;
export const SCR_BOTTOM = 0;

export function calcPoleData(stageWidth, stageHeight, defxn, defyn) {
  const scaling = Math.max(0.1, (stageWidth - SCR_LEFT - SCR_RIGHT) / ORIGINAL_WIDTH);
  let poleLeft = POLE_LEFT;
  let poleRight = POLE_RIGHT;
  let poleTop = POLE_TOP;
  const poleBottom = POLE_BOTTOM;
  let poleBottomWidth = stageWidth - SCR_LEFT - SCR_RIGHT - (poleLeft + poleRight) * scaling;
  let poleHeight = stageHeight - SCR_TOP - SCR_BOTTOM - (poleTop + poleBottom) * scaling;
  let kletkaWidth = poleBottomWidth / (defxn - 2);
  const kletkaHeight = poleHeight / defyn;
  const poleWidthHeightDivider = Math.max(POLE_WIDTH_HEIGHT_DIV, POLE_WIDTH_HEIGHT_DIV_DYNAMIC / defyn * 10);

  if (kletkaWidth * poleWidthHeightDivider > kletkaHeight) {
    const targetWidth = (poleHeight / defyn) * (defxn - 2) / poleWidthHeightDivider;
    const minus = stageWidth - SCR_LEFT - SCR_RIGHT - targetWidth - (poleLeft + poleRight) * scaling;
    poleLeft = poleRight = (stageWidth - SCR_LEFT - SCR_RIGHT - targetWidth) / scaling / 2;
    const widthMinus = stageWidth - SCR_LEFT - SCR_RIGHT - minus;
    poleTop = POLE_TOP_DEF * 12 / (defxn - 2) * widthMinus / ORIGINAL_WIDTH / scaling;
    poleBottomWidth = stageWidth - SCR_LEFT - SCR_RIGHT - (poleLeft + poleRight) * scaling;
    poleHeight = stageHeight - SCR_TOP - SCR_BOTTOM - (poleTop + poleBottom) * scaling;
    kletkaWidth = poleBottomWidth / (defxn - 2);
  }

  const poleTopWidth = poleBottomWidth * TOP_SIZE_DEF;
  const poleHeightMinus = Math.max(0, poleHeight - Math.min(poleHeight / defyn, kletkaWidth) * defyn);
  poleHeight -= poleHeightMinus;
  const kletkaHeightAdjusted = poleHeight / defyn;
  return {
    poleBottomWidth,
    poleTopWidth,
    poleHeight,
    poleLeftNow: poleLeft * scaling,
    poleTopNow: poleTop * scaling,
    kletkaWidth,
    kletkaHeight: kletkaHeightAdjusted,
    scaling,
  };
}

export function getxa(x, y, pd, defxn, defyn) {
  const { poleBottomWidth, poleTopWidth, poleHeight, poleLeftNow, poleTopNow } = pd;
  const a = {};
  a.y0 = SCR_TOP + poleTopNow + poleHeight * y / defyn;
  a.y2 = SCR_TOP + poleTopNow + poleHeight * (y - 1) / defyn;
  a.x0 = poleLeftNow + SCR_LEFT
    + (poleBottomWidth - poleTopWidth) / 2 * (defyn - y) / defyn
    + ((poleBottomWidth - poleTopWidth) * y / defyn + poleTopWidth) * (x - 1) / (defxn - 2);
  a.x1 = poleLeftNow + SCR_LEFT
    + (poleBottomWidth - poleTopWidth) / 2 * (defyn - y) / defyn
    + ((poleBottomWidth - poleTopWidth) * y / defyn + poleTopWidth) * x / (defxn - 2);
  a.x2 = poleLeftNow + SCR_LEFT
    + (poleBottomWidth - poleTopWidth) / 2 * (defyn - (y - 1)) / defyn
    + ((poleBottomWidth - poleTopWidth) * (y - 1) / defyn + poleTopWidth) * x / (defxn - 2);
  a.x3 = poleLeftNow + SCR_LEFT
    + (poleBottomWidth - poleTopWidth) / 2 * (defyn - (y - 1)) / defyn
    + ((poleBottomWidth - poleTopWidth) * (y - 1) / defyn + poleTopWidth) * (x - 1) / (defxn - 2);
  a.xc = (a.x0 + a.x1 + a.x2 + a.x3) / 4;
  a.yc = (a.y0 + a.y2) / 2;
  return a;
}

export function shadeColor(color, pct) {
  const n = parseInt(color.replace('#', ''), 16);
  const a = Math.round(2.55 * pct);
  const R = Math.max(0, Math.min(255, (n >> 16) + a));
  const G = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + a));
  const B = Math.max(0, Math.min(255, (n & 0xff) + a));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function stackImageUrl(stack) {
  const name = stack.animUnit || stack.sysName;
  return `https://dcdn.heroeswm.ru/i/png40/${name}.png`;
}

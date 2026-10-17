// palette.js: the key-art color tokens + supporting pixel-art ramps sampled from reference/keyart-2400x1200.png.
// Rule: type uses ONLY C.cream / C.sky (and C.tealDark on coral chips). Pixel art may use the ramps below.
// Ramps are ordered DARK -> LIGHT. Index them (RAMP.water[2]) rather than inventing new hexes.

/** Brand tokens (BRIEF section 3). */
export const C = Object.freeze({
  teal: '#285B55',      // main background
  tealDark: '#214D49',  // shadows / panels / night tint
  tealDeep: '#173B38',  // deepest shadow, night sky base
  cream: '#F7F7F2',     // primary type, lighthouse body, highlights
  sky: '#79AED3',       // secondary type ("in the 757"), water highlights, clouds
  coral: '#F07770',     // accent: chips, ||| bars, lighthouse roof, corner pixels
  gold: '#F5C04A',      // sparkles, lantern glow, sun, stars (sparingly)
});

/** Supporting ramps (dark -> light). Sampled from the key art unless noted. */
export const RAMP = Object.freeze({
  // background teal family incl. night tints (night sky banding uses these)
  teal: ['#0F2B2A', '#173B38', '#1B4440', '#214D49', '#285B55', '#2F6660', '#3A716A'],
  // Chesapeake water: deep shadow -> streak blues -> foam (key art water streaks)
  water: ['#1D4C4A', '#2B6A80', '#3F8ABD', '#5A9CC6', '#79AED3', '#A5CFE8', '#C1E2F2'],
  // foliage: shadow teal-greens -> leaf greens -> lit grass (key art bushes/trees)
  foliage: ['#08393C', '#0C4144', '#1F5249', '#2E6348', '#4A7A45', '#5D8B3B', '#7FA05A'],
  // seawall / rocks / sand (key art stonework)
  stone: ['#3E4A44', '#5E665A', '#827F6F', '#9A9787', '#C9B795', '#E3CDAB', '#F2E3CB'],
  // lighthouse body: outline-ish shade -> shade side -> lit side -> highlight
  tower: ['#798F86', '#B9B19C', '#E6D9C1', '#F2EADA', '#FDF7EA'],
  // roofs (lighthouse cap + keeper's house)
  roof: ['#8F4F47', '#AD5E52', '#D55449', '#F07770', '#FB7966'],
  // lantern room: iron/navy gallery + glass/glow
  iron: ['#052C3C', '#063849', '#0D4458', '#286A7E', '#3F8ABD'],
  glow: ['#B97469', '#D1AC70', '#F5C04A', '#F8CC87', '#FFF1C9'],
  // keeper's house walls / windows
  house: ['#736653', '#C9BBA0', '#E1D6BD', '#EFE8D6', '#FBFAF2'],
  window: ['#07383B', '#0B3C3E', '#123F42'],
  // clouds: shadow sky -> sky -> warm cream top (key art 2-tone clouds)
  cloud: ['#5E92B8', '#79AED3', '#B9D5DC', '#F9EDD8', '#FBF4E4'],
  // autumn accents for leaves / pumpkins (kept in the warm coral/gold family)
  autumn: ['#8F4F47', '#C8613F', '#E0874A', '#F07770', '#F5A55A', '#F5C04A'],
  // inclusive skin tones (pairs: [shadow, base]); use RAMP.skin[i][1] for base, [0] for shade
  skin: [
    ['#D9AE8E', '#F3D2B5'],
    ['#C8916A', '#E6B48C'],
    ['#A8714A', '#C98D60'],
    ['#87532F', '#A86B45'],
    ['#643A22', '#7D4A2E'],
    ['#46271A', '#5A3420'],
  ],
  hair: ['#1B1714', '#3A2A20', '#6B4228', '#A85F32', '#D9B26A', '#B7B7B0'],
  // generic dark ink for pixel outlines that sit on teal (never pure black)
  ink: ['#0B2422', '#123331', '#173B38'],
});

/** Time-of-day sky band presets (top -> horizon). Used by world.sky(). */
export const SKY = Object.freeze({
  night: ['#0F2B2A', '#122F2E', '#153533', '#173B38', '#1B4440', '#214D49'],
  predawn: ['#122F2E', '#173B38', '#1B4440', '#214D49', '#3D5653', '#6B5E62'],
  dawn: ['#1B4440', '#214D49', '#285B55', '#4E6763', '#B07A6E', '#F09A76', '#F5C04A'],
  day: ['#285B55'],  // the key art background is flat teal: keep day skies flat
  dusk: ['#173B38', '#1E4543', '#30505A', '#5A5468', '#A86A6E', '#F07770', '#F5A55A'],
});

/** Per time-of-day colors for world props (world.js picks from here). */
const TOD_ = {
  day: {
    towerLit: '#FDF7EA', towerMid: '#F2EADA', towerShade: '#E6D9C1', towerEdge: '#B9B19C', towerWin: '#173B38',
    roof: '#F07770', roofShade: '#AD5E52', roofLight: '#FB7966',
    iron: '#063849', ironDark: '#052C3C', ironLight: '#286A7E', glass: '#F8CC87', glassHot: '#FFF1C9', glassDim: '#D1AC70',
    wall: '#EFE8D6', wallShade: '#C9BBA0', houseRoof: '#D55449', houseRoofLight: '#F07770', win: '#0B3C3E',
    leaf: ['#08393C', '#0C4144', '#2E6348', '#4A7A45', '#5D8B3B', '#7FA05A'],
    stone: ['#3E4A44', '#5E665A', '#827F6F', '#9A9787', '#C9B795', '#E3CDAB'],
    water: ['#1D4C4A', '#2B6A80', '#3F8ABD', '#5A9CC6', '#79AED3', '#A5CFE8', '#C1E2F2'],
    cloud: ['#5E92B8', '#79AED3', '#F9EDD8'], gull: '#F7F7F2', gullShade: '#B9D5DC',
  },
  night: {
    towerLit: '#C9D1C6', towerMid: '#A9B5AB', towerShade: '#8A9A92', towerEdge: '#5E7570', towerWin: '#F5C04A',
    roof: '#B85A55', roofShade: '#7A3E3E', roofLight: '#D06A62',
    iron: '#052C3C', ironDark: '#03202C', ironLight: '#1D5568', glass: '#F5C04A', glassHot: '#FFF1C9', glassDim: '#D1AC70',
    wall: '#8C9488', wallShade: '#66706A', houseRoof: '#8F4F47', houseRoofLight: '#AD5E52', win: '#F5C04A',
    leaf: ['#061F21', '#082B2D', '#0F3A36', '#1F5249', '#2E6348', '#3F6E45'],
    stone: ['#1F2A28', '#2E3936', '#46504A', '#5E665A', '#7A7A6A', '#9A9787'],
    water: ['#0F2B2A', '#163C45', '#1F5468', '#2B6A80', '#3F8ABD', '#79AED3', '#C1E2F2'],
    cloud: ['#1F4A52', '#2F5F6E', '#4D7F95'], gull: '#C9D1C6', gullShade: '#8A9A92',
  },
};
TOD_.dawn = TOD_.day;
TOD_.dusk = { ...TOD_.day, towerShade: '#D9B8A6', towerEdge: '#A88A80', win: '#F5C04A', towerWin: '#173B38' };
export const TOD = Object.freeze(TOD_);

/** Parse '#RRGGBB' -> [r,g,b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** [r,g,b] -> '#RRGGBB'. */
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
/**
 * Mix two hex colors (k=0 -> a, k=1 -> b). Use sparingly in pixel art (prefer dither between ramp colors);
 * fine for full-res type glows and for fades on the hi layer.
 */
export function mix(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
}
/** CSS rgba() string from hex + alpha (for the hi layer). */
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

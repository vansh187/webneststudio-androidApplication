/**
 * WebNest Studio palette — ported from the production web design system
 * (.reference/frontend/src/index.css). Gold on ink, luxury-first.
 */

export const gold = {
  50: '#FDF8EC',
  100: '#FAEDC9',
  200: '#F4DA96',
  300: '#EDC363',
  400: '#E6AC3E',
  500: '#D4A94F',
  600: '#B8862C',
  700: '#966523',
  800: '#7A5122',
  900: '#66431F',
} as const;

export const ink = {
  50: '#F4F5F7',
  100: '#E5E7EB',
  200: '#C9CCD3',
  300: '#9A9FAC',
  400: '#6B7180',
  500: '#454B59',
  600: '#2C3140',
  700: '#1B1F2B',
  800: '#12151E',
  900: '#090A10',
  950: '#050609',
} as const;

export const colors = {
  // Surfaces
  bgBase: ink[950],
  bgElevated: '#0B0D14',
  surface: ink[800],
  surfaceSubtle: 'rgba(255, 255, 255, 0.03)',
  surfaceGold: 'rgba(230, 172, 62, 0.10)',

  // Borders / hairlines
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  borderAccent: 'rgba(230, 172, 62, 0.40)',
  hairline: 'rgba(255, 255, 255, 0.06)',

  // Gold family
  goldPrimary: gold[300],
  goldBright: gold[400],
  goldDeep: gold[600],
  goldFill: gold[400],
  goldFillText: ink[950],

  // Text
  textPrimary: '#F6F7F9',
  textSecondary: ink[300],
  textTertiary: ink[400],
  textLabel: gold[300],
  textMuted: '#6B6558',
  textOnGold: ink[950],

  // Status
  danger: '#E58D7D',
  success: '#8FCB9B',
  successBright: '#34D399',

  // Overlays
  scrim: 'rgba(5, 6, 9, 0.72)',
} as const;

/** Linear-gradient stop lists (consumed by BrandGradient / gradient text). */
export const gradients = {
  gold: [gold[200], gold[500], gold[700]] as const,
  goldSoft: [gold[300], gold[500]] as const,
   inkPanel: ['#12151E', ink[950]] as const,
  heroGlow: ['rgba(230,172,62,0.18)', 'rgba(230,172,62,0)'] as const,
};

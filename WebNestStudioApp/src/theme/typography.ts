import { Platform, TextStyle } from 'react-native';

/**
 * Type system. Custom brand faces (Poppins display / Playfair serif) can be
 * dropped into src/assets/fonts + `npx react-native-asset` later; until then we
 * lean on the sharpest platform faces so the app still reads premium.
 */
export const font = {
  // Editorial serif for hero + section titles.
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  // Geometric-ish sans for display lines.
  display: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
  // Body / UI.
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  sansLight: Platform.select({
    ios: 'System',
    android: 'sans-serif-light',
    default: 'System',
  }) as string,
};

type Variant =
  | 'display'
  | 'title'
  | 'sectionTitle'
  | 'rowTitle'
  | 'body'
  | 'bodyStrong'
  | 'lead'
  | 'label'
  | 'muted'
  | 'caption'
  | 'button';

export const type: Record<Variant, TextStyle> = {
  display: {
    fontFamily: font.serif,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontFamily: font.serif,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '500',
  },
  rowTitle: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  bodyStrong: {
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  lead: {
    fontFamily: font.sansLight,
    fontSize: 17,
    lineHeight: 27,
  },
  label: {
    fontFamily: font.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  muted: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  caption: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: font.display,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
};

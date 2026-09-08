import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';

import { colors } from '../theme/colors';
import { type as typeScale } from '../theme/typography';

type Variant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'gold' | 'muted' | 'onGold' | 'danger';

type Props = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    tone?: Tone;
    center?: boolean;
  }
>;

const toneColor: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  gold: colors.goldPrimary,
  muted: colors.textMuted,
  onGold: colors.textOnGold,
  danger: colors.danger,
};

const defaultTone: Partial<Record<Variant, Tone>> = {
  body: 'secondary',
  lead: 'secondary',
  muted: 'muted',
  caption: 'tertiary',
  label: 'gold',
  button: 'onGold',
};

export function Text({ children, style, variant = 'body', tone, center, ...props }: Props) {
  const resolvedTone = tone ?? defaultTone[variant] ?? 'primary';
  return (
    <RNText
      {...props}
      style={[
        typeScale[variant],
        { color: toneColor[resolvedTone] },
        center && styles.center,
        style,
      ]}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});

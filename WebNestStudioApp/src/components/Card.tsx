import React, { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { radii, shadow, spacing } from '../theme/spacing';
import { Gradient } from './Gradient';

type Props = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'plain' | 'elevated' | 'gold';
  padded?: boolean;
  style?: ViewStyle;
}>;

export function Card({ children, onPress, variant = 'plain', padded = true, style }: Props) {
  const inner = (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        variant === 'elevated' && styles.elevated,
        variant === 'gold' && styles.gold,
        style,
      ]}>
      {variant === 'gold' ? (
        <Gradient
          colors={['rgba(230,172,62,0.14)', 'rgba(230,172,62,0.02)']}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );

  if (!onPress) {
    return inner;
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    ...shadow.card,
  },
  gold: {
    borderColor: colors.borderAccent,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, gradients } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Gradient } from './Gradient';
import { Text } from './Text';

type Props = {
  label: string;
  tone?: 'gold' | 'success' | 'neutral';
};

export function Badge({ label, tone = 'gold' }: Props) {
  const isGold = tone === 'gold';
  return (
    <View
      style={[
        styles.wrap,
        tone === 'success' && styles.success,
        tone === 'neutral' && styles.neutral,
      ]}>
      {isGold ? (
        <Gradient
          colors={gradients.goldSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.goldWash]}
        />
      ) : null}
      {tone === 'success' ? <View style={styles.dot} /> : null}
      {isGold ? (
        <View style={styles.marker}>
          <View style={styles.markerCore} />
        </View>
      ) : null}
      <Text
        variant="label"
        tone={tone === 'success' ? 'primary' : 'gold'}
        style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceGold,
    borderColor: colors.goldOutline,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  goldWash: {
    opacity: 0.12,
  },
  success: {
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    borderColor: 'rgba(52, 211, 153, 0.40)',
  },
  neutral: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  dot: {
    backgroundColor: colors.successBright,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  // Small gold diamond — a quiet piece of jewellery on the eyebrow.
  marker: {
    alignItems: 'center',
    borderColor: colors.goldOutline,
    borderRadius: 2,
    borderWidth: 1,
    height: 9,
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    width: 9,
  },
  markerCore: {
    backgroundColor: colors.goldBright,
    height: 3,
    width: 3,
  },
  text: {
    fontSize: 10,
    letterSpacing: 2.6,
  },
});

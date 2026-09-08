import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { font } from '../theme/typography';
import { Text } from './Text';

const MARK = require('../assets/logo.png');

type Size = 'sm' | 'md' | 'lg' | 'xl';

const RING: Record<Size, number> = { sm: 32, md: 42, lg: 64, xl: 96 };
const WORD: Record<Size, number> = { sm: 15, md: 18, lg: 24, xl: 30 };

type Props = {
  size?: Size;
  showWordmark?: boolean;
};

export function Logo({ size = 'md', showWordmark = true }: Props) {
  const ring = RING[size];
  return (
    <View style={styles.row}>
      <View style={[styles.markWrap, { width: ring, height: ring, borderRadius: ring / 2 }]}>
        <Image source={MARK} style={styles.mark} resizeMode="cover" />
      </View>
      {showWordmark ? (
        <Text style={[styles.word, { fontSize: WORD[size] }]}>
          WebNest <Text style={[styles.word, styles.studio, { fontSize: WORD[size] }]}>Studio</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  markWrap: {
    borderColor: colors.borderAccent,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mark: {
    height: '100%',
    width: '100%',
  },
  word: {
    color: colors.textPrimary,
    fontFamily: font.display,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  studio: {
    color: colors.goldPrimary,
  },
});

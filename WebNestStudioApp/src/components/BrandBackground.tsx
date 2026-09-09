import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Ambient luxury backdrop — soft gold light bloom top-right, cooler bloom lower
 * left, over the ink base. Purely decorative and non-interactive.
 */
export function BrandBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.orb, styles.orbGold]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbDeep]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bgBase,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  orb: {
    borderRadius: 999,
    position: 'absolute',
  },
  orbGold: {
    backgroundColor: 'rgba(230, 172, 62, 0.12)',
    height: 380,
    right: -140,
    top: -160,
    width: 380,
  },
  orbDeep: {
    backgroundColor: 'rgba(150, 101, 35, 0.10)',
    bottom: -180,
    height: 320,
    left: -150,
    width: 320,
  },
});

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { BrandBackground } from '../components/BrandBackground';
import { Logo } from '../components/Logo';
import { Text } from '../components/Text';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(rise, { toValue: 0, useNativeDriver: true, speed: 6, bounciness: 4 }),
    ]).start();
  }, [fade, rise]);

  return (
    <BrandBackground>
      <View style={styles.center}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Logo size="xl" showWordmark={false} />
          <View style={styles.wordmark}>
            <Text variant="title" center>
              WebNest <Text variant="title" tone="gold">Studio</Text>
            </Text>
          </View>
          <Text variant="label" tone="gold" center style={styles.tag}>
            Where Brands Go Digital
          </Text>
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <View style={styles.bar} />
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: spacing.lg,
  },
  tag: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  bar: {
    backgroundColor: colors.goldPrimary,
    borderRadius: 999,
    height: 3,
    opacity: 0.5,
    width: 48,
  },
});

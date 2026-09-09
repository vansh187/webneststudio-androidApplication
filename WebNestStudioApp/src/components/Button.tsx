import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors, gradients } from '../theme/colors';
import { radii, shadow, spacing } from '../theme/spacing';
import { Gradient } from './Gradient';
import { Text } from './Text';

type Variant = 'primary' | 'outline' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  /** Filled/outline buttons letter-space in caps by default; opt out for sentence copy. */
  uppercase?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  fullWidth = true,
  uppercase,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const sheen = useRef(new Animated.Value(1)).current;
  const isDisabled = Boolean(disabled || loading);

  const animateTo = (toScale: number, toSheen: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }),
      Animated.timing(sheen, { toValue: toSheen, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const tint =
    variant === 'primary'
      ? colors.textOnGold
      : variant === 'outline'
      ? colors.goldPrimary
      : colors.goldPrimary;

  const caps = uppercase ?? variant !== 'ghost';
  const label = caps ? title.toUpperCase() : title;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && styles.fullWidth,
        variant === 'primary' && !isDisabled && shadow.goldStrong,
        style,
      ]}>
      <Pressable
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => animateTo(0.97, variant === 'ghost' ? 1 : 0.3)}
        onPressOut={() => animateTo(1, 1)}
        style={styles.press}>
        <View
          style={[
            styles.base,
            variant === 'primary' && styles.primary,
            variant === 'outline' && styles.outline,
            variant === 'ghost' && styles.ghost,
            isDisabled && styles.disabled,
          ]}>
          {variant === 'primary' ? (
            <Gradient
              colors={gradients.goldMetal}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {/* Bevelled top-edge highlight — catches the light, dims on press. */}
          {variant !== 'ghost' ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sheen,
                variant === 'outline' && styles.sheenOutline,
                { opacity: sheen },
              ]}>
              <Gradient
                colors={gradients.sheen}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <View style={styles.content}>
              <Text variant="button" style={[styles.label, { color: tint }]}>
                {label}
              </Text>
              {icon ? <Icon name={icon} size={16} color={tint} /> : null}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  press: { borderRadius: radii.pill },
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
  },
  primary: {
    borderColor: colors.goldEdge,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: colors.surfaceGoldStrong,
    borderColor: colors.goldOutline,
    borderWidth: 1.5,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  sheen: {
    height: '58%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheenOutline: {
    height: '52%',
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    letterSpacing: 1.4,
  },
});

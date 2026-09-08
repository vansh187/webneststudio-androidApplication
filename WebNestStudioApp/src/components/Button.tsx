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
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = Boolean(disabled || loading);

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const tint =
    variant === 'primary' ? colors.textOnGold : variant === 'outline' ? colors.goldPrimary : colors.textSecondary;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && styles.fullWidth,
        variant === 'primary' && !isDisabled && shadow.gold,
        style,
      ]}>
      <Pressable
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        style={styles.press}>
        <View
          style={[
            styles.base,
            variant === 'outline' && styles.outline,
            variant === 'ghost' && styles.ghost,
            isDisabled && styles.disabled,
          ]}>
          {variant === 'primary' ? (
            <Gradient
              colors={gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {loading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <View style={styles.content}>
              <Text variant="button" style={{ color: tint }}>
                {title}
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
    minHeight: 54,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderColor: colors.borderAccent,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

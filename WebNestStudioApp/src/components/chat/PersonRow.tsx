import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { Text } from '../Text';
import { ChatAvatar } from './ChatAvatar';

type Props = {
  name?: string | null;
  email?: string;
  onPress?: () => void;
  selected?: boolean;
  selectable?: boolean;
  trailingIcon?: string;
};

export function PersonRow({
  name,
  email,
  onPress,
  selected = false,
  selectable = false,
  trailingIcon,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ChatAvatar name={name || email} size={42} />
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name || email || 'Unknown'}
        </Text>
        {email ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {email}
          </Text>
        ) : null}
      </View>
      {selectable ? (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <Icon name="check" size={14} color={colors.textOnGold} /> : null}
        </View>
      ) : trailingIcon ? (
        <Icon name={trailingIcon} size={18} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  check: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkOn: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
});

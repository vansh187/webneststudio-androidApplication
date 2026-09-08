import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <Text variant="caption" tone={selected ? 'onGold' : 'tertiary'} style={styles.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selected: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  text: {
    fontWeight: '600',
  },
});

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import CrownIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  title: string;
  detail: string;
  selected: boolean;
  prime?: boolean;
  role?: 'radio' | 'checkbox';
  onPress: () => void;
};

export function PlanOption({ title, detail, selected, prime, role = 'radio', onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}>
      <View style={[styles.mark, selected && styles.markOn]}>
        {selected ? <Icon name="check" size={12} color={colors.textOnGold} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.title}>
          {prime ? <CrownIcon name="crown" size={16} color={colors.goldPrimary} /> : null}
          <Text variant="bodyStrong" tone="primary" style={styles.titleText}>
            {title}
          </Text>
        </View>
        <Text variant="muted" tone="secondary">
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plan: {
    alignItems: 'flex-start',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  planSelected: {
    backgroundColor: colors.surfaceGold,
    borderColor: colors.goldOutline,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  titleText: {
    flexShrink: 1,
  },
  mark: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    marginTop: 2,
    width: 20,
  },
  markOn: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
});

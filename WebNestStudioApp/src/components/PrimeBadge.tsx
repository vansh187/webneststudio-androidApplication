import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { font } from '../theme/typography';
import { formatDate } from '../utils/format';
import { Text } from './Text';

/** The small crown tag that sits on top of the logo for a Prime member. */
export function PrimeTag() {
  return (
    <View style={styles.tag} accessibilityLabel="Prime member">
      <Icon name="crown" size={10} color={colors.textOnGold} />
      <Text style={styles.tagText}>PRIME</Text>
    </View>
  );
}

type Props = {
  label: string;
  expiresAt?: string | null;
};

/** The server's member label with a crown, for the user's profile. */
export function PrimeBadge({ label, expiresAt }: Props) {
  return (
    <View style={styles.badgeBlock}>
      <View style={styles.badge}>
        <Icon name="crown" size={14} color={colors.goldPrimary} />
        <Text variant="caption" tone="gold" style={styles.badgeText}>
          {label}
        </Text>
      </View>
      {expiresAt ? (
        <Text variant="caption" tone="tertiary">
          Valid until {formatDate(expiresAt)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderColor: colors.goldEdge,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagText: {
    color: colors.textOnGold,
    fontFamily: font.display,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    lineHeight: 12,
  },
  badgeBlock: {
    alignItems: 'flex-start',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  badgeText: {
    fontWeight: '700',
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { gradients } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Badge } from './Badge';
import { Gradient } from './Gradient';
import { Text } from './Text';

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <Badge label={eyebrow} />
      <View style={styles.titleRow}>
        <Gradient
          colors={gradients.goldSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.rule}
        />
        <Text variant="sectionTitle" style={styles.title}>
          {title}
        </Text>
      </View>
      {description ? <Text variant="body">{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // Slim vertical gold bar beside the heading — an editorial margin mark.
  rule: {
    borderRadius: 999,
    marginTop: 4,
    width: 3,
  },
  title: {
    flex: 1,
  },
});

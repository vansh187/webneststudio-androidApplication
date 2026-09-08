import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme/spacing';
import { Badge } from './Badge';
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
      <Text variant="sectionTitle">{title}</Text>
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
});

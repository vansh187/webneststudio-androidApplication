import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';

import { webnestApi } from '../api/webnestApi';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ErrorView, SkeletonRows } from '../components/StateView';
import { Text } from '../components/Text';
import { TECH_CATEGORIES } from '../data/content';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';

export function ServicesScreen() {
  const { data, error, isError, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['services'],
    queryFn: webnestApi.services,
  });

  const items =
    data && data.length > 0
      ? data.map(s => ({
          title: s.title ?? 'Service',
          description: s.short_description ?? s.full_description ?? '',
          technologies: s.tech_tags ?? [],
          icon: 'layers',
        }))
      : TECH_CATEGORIES;

  return (
    <Screen refreshing={isFetching} onRefresh={refetch}>
      <SectionHeader
        eyebrow="Catalogue"
        title="What clients can request"
        description="Every engagement follows a structured SDLC — discovery, design, build, QA, deploy, and maintenance."
      />
      {isLoading ? <SkeletonRows count={4} /> : null}
      {isError && !items.length ? <ErrorView error={error} onRetry={() => refetch()} /> : null}
      <View style={styles.stack}>
        {items.map(item => (
          <Card key={item.title} style={styles.card}>
            <View style={styles.head}>
              <View style={styles.iconBox}>
                <Icon name={item.icon} size={18} color={colors.goldPrimary} />
              </View>
              <Text variant="rowTitle" style={styles.flex1}>
                {item.title}
              </Text>
            </View>
            <Text variant="muted">{item.description}</Text>
            {item.technologies.length ? (
              <View style={styles.tags}>
                {item.technologies.slice(0, 6).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text variant="caption" tone="tertiary">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  head: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  flex1: { flex: 1 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

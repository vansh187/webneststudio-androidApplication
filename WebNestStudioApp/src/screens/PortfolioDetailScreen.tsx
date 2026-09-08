import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { webnestApi } from '../api/webnestApi';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'PortfolioDetail'>;

export function PortfolioDetailScreen({ route }: Props) {
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ['portfolio', route.params.slug],
    queryFn: () => webnestApi.portfolioDetail(route.params.slug),
  });

  if (isLoading) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <ErrorView error={error} onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <EmptyView message="Project not found." />
      </Screen>
    );
  }

  return (
    <Screen style={styles.content}>
      {data.cover_image_url ? <Image source={{ uri: data.cover_image_url }} style={styles.image} /> : null}
      <Badge label={data.category || 'Case study'} />
      <Text variant="title">{data.title}</Text>
      <Text variant="lead">{data.full_description || data.short_description}</Text>

      {data.result_metrics ? (
        <Card variant="gold" style={styles.metric}>
          <Text variant="label" tone="gold">
            Result
          </Text>
          <Text variant="rowTitle">{data.result_metrics}</Text>
        </Card>
      ) : null}

      {data.tech_stack?.length ? (
        <View style={styles.tags}>
          {data.tech_stack.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text variant="caption" tone="tertiary">
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  image: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 220,
    width: '100%',
  },
  metric: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
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

import React from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { webnestApi } from '../api/webnestApi';
import { Badge } from '../components/Badge';
import { Divider } from '../components/Divider';
import { Screen } from '../components/Screen';
import { EmptyView, ErrorView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';
import { formatDate, readTime } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'BlogDetail'>;

export function BlogDetailScreen({ route }: Props) {
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ['blog', route.params.slug],
    queryFn: () => webnestApi.blogDetail(route.params.slug),
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
        <EmptyView message="Article not found." />
      </Screen>
    );
  }

  return (
    <Screen style={styles.content}>
      <Badge label={`${formatDate(data.published_at)} · ${readTime(data.word_count)}`} tone="neutral" />
      <Text variant="title">{data.title}</Text>
      <Text variant="lead">{data.excerpt}</Text>
      <Divider gap={spacing.md} />
      <Text variant="body" tone="secondary">
        {data.content || 'Full article content is not available yet.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
});

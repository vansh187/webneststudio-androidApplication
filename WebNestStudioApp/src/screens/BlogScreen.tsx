import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { webnestApi } from '../api/webnestApi';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyView, ErrorView, SkeletonRows } from '../components/StateView';
import { Text } from '../components/Text';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';
import { formatDate, readTime } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function BlogScreen() {
  const navigation = useNavigation<Nav>();
  const { data, error, isError, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['blog'],
    queryFn: () => webnestApi.blog(),
  });

  return (
    <Screen refreshing={isFetching} onRefresh={refetch}>
      <SectionHeader eyebrow="Journal" title="WebNest notes" description="Field notes on web, AI, and engineering craft." />
      {isLoading ? <SkeletonRows count={4} /> : null}
      {isError ? <ErrorView error={error} onRetry={() => refetch()} /> : null}
      {!isLoading && !isError && !data?.length ? <EmptyView message="No posts published yet." /> : null}
      <View style={styles.stack}>
        {data?.map(post => (
          <Card
            key={post.id}
            style={styles.card}
            onPress={() => navigation.navigate('BlogDetail', { slug: post.slug, title: post.title })}>
            <Text variant="label" tone="gold">
              {formatDate(post.published_at)} · {readTime(post.word_count)}
            </Text>
            <Text variant="rowTitle">{post.title}</Text>
            <Text variant="muted" numberOfLines={2}>
              {post.excerpt}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  card: { gap: spacing.xs },
});

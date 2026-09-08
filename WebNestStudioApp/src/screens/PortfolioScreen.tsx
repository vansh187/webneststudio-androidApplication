import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';

import { webnestApi } from '../api/webnestApi';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ErrorView, SkeletonRows } from '../components/StateView';
import { Text } from '../components/Text';
import { DELIVERED_PROJECTS, ONGOING_PROJECTS } from '../data/content';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PortfolioScreen() {
  const navigation = useNavigation<Nav>();
  const { data, error, isError, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => webnestApi.portfolio(),
  });

  const hasApiData = Boolean(data && data.length);

  return (
    <Screen refreshing={isFetching} onRefresh={refetch}>
      <SectionHeader eyebrow="Portfolio" title="Client work" description="Real builds, real outcomes." />

      {isLoading ? <SkeletonRows count={3} /> : null}
      {isError && !hasApiData ? <ErrorView error={error} onRetry={() => refetch()} /> : null}

      {hasApiData ? (
        <View style={styles.stack}>
          {data!.map(item => (
            <Card
              key={item.id}
              padded={false}
              style={styles.card}
              onPress={() => navigation.navigate('PortfolioDetail', { slug: item.slug, title: item.title })}>
              {item.cover_image_url ? (
                <Image source={{ uri: item.cover_image_url }} style={styles.image} />
              ) : null}
              <View style={styles.body}>
                <Text variant="label" tone="gold">
                  {item.category || 'Case study'}
                </Text>
                <Text variant="rowTitle">{item.title}</Text>
                <Text variant="muted" numberOfLines={2}>
                  {item.short_description}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <>
          <Text variant="label" tone="gold" style={styles.groupLabel}>
            Delivered
          </Text>
          <View style={styles.stack}>
            {DELIVERED_PROJECTS.map(p => (
              <ProjectCard key={p.name} name={p.name} description={p.description} url={p.url} tag="Live" tone="success" />
            ))}
          </View>
          <Text variant="label" tone="gold" style={styles.groupLabel}>
            In build
          </Text>
          <View style={styles.stack}>
            {ONGOING_PROJECTS.map(p => (
              <ProjectCard key={p.name} name={p.name} description={p.description} url={p.url} tag="In build" tone="neutral" />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function ProjectCard({
  name,
  description,
  url,
  tag,
  tone,
}: {
  name: string;
  description: string;
  url: string;
  tag: string;
  tone: 'success' | 'neutral';
}) {
  return (
    <Card style={styles.projectCard} onPress={() => Linking.openURL(url)}>
      <View style={styles.projectHead}>
        <Text variant="rowTitle" style={styles.flex1}>
          {name}
        </Text>
        <Badge label={tag} tone={tone} />
      </View>
      <Text variant="muted">{description}</Text>
      <View style={styles.linkRow}>
        <Text variant="label" tone="gold">
          Visit site
        </Text>
        <Icon name="external-link" size={14} color={colors.goldPrimary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  groupLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { marginBottom: spacing.xs },
  image: {
    backgroundColor: colors.surface,
    height: 180,
    width: '100%',
  },
  body: { gap: 4, padding: spacing.md },
  projectCard: { gap: spacing.sm },
  projectHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: { flex: 1 },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

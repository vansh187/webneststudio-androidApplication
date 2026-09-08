import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';

import { webnestApi } from '../api/webnestApi';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Stat } from '../components/Stat';
import { ErrorView, SkeletonRows } from '../components/StateView';
import { Text } from '../components/Text';
import {
  BRAND,
  CONTACT,
  DELIVERED_PROJECTS,
  ONGOING_PROJECTS,
  PROCESS,
  STATS,
  TECH_CATEGORIES,
} from '../data/content';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';

const HERO_POINTS = ['Any language, any stack', 'AI-first engineering', 'Design that converts'];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const services = useQuery({ queryKey: ['home', 'services'], queryFn: webnestApi.servicesPreview });
  const work = useQuery({ queryKey: ['home', 'featuredWork'], queryFn: webnestApi.featuredWork });
  const stats = useQuery({ queryKey: ['home', 'stats'], queryFn: webnestApi.stats });

  const statItems = stats.data
    ? Object.entries(stats.data)
        .slice(0, 4)
        .map(([key, value]) => {
          // Floor projects-delivered at 1 so a lagging backend catalogue never
          // shows a bare "0" (V Stitch is live in production).
          const n = Number(value);
          const shown =
            key.includes('delivered') && Number.isFinite(n) && n < 1 ? '1' : String(value);
          return { value: shown, label: key.replace(/_/g, ' ') };
        })
    : STATS;

  const serviceCards =
    services.data && services.data.length > 0
      ? services.data.map(s => ({
          title: s.title ?? 'Service',
          body: s.short_description ?? s.full_description ?? '',
        }))
      : TECH_CATEGORIES.slice(0, 4).map(c => ({ title: c.title, body: c.description }));

  return (
    <Screen
      refreshing={stats.isFetching || services.isFetching}
      onRefresh={() => {
        stats.refetch();
        services.refetch();
        work.refetch();
      }}>
      {/* HERO */}
      <View style={styles.hero}>
        <Logo size="md" />
        <Badge label="IT Consultancy · Web · AI" />
        <Text variant="display">
          Where Brands{'\n'}
          <Text variant="display" tone="gold">
            Go Digital.
          </Text>
        </Text>
        <Text variant="lead">{BRAND.hero}</Text>
        <View style={styles.heroActions}>
          <Button title="Discuss your project" icon="arrow-right" onPress={() => navigation.navigate('Contact')} />
          <Button
            title="Explore services"
            variant="outline"
            onPress={() => navigation.navigate('Services')}
          />
        </View>
        <View style={styles.points}>
          {HERO_POINTS.map(p => (
            <View key={p} style={styles.point}>
              <Icon name="check" size={15} color={colors.goldPrimary} />
              <Text variant="caption" tone="secondary">
                {p}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statGrid}>
        {statItems.map(s => (
          <Stat key={s.label} value={s.value} label={s.label} />
        ))}
      </View>

      {/* MILESTONE */}
      {DELIVERED_PROJECTS.map(project => (
        <Card
          key={project.name}
          variant="gold"
          style={styles.milestone}
          onPress={() => Linking.openURL(project.url)}>
          <Badge label="First project delivered" tone="success" />
          <Text variant="rowTitle">{project.name} is live in production</Text>
          <Text variant="body">{project.description}</Text>
          <View style={styles.linkRow}>
            <Text variant="label" tone="gold">
              Visit live site
            </Text>
            <Icon name="external-link" size={14} color={colors.goldPrimary} />
          </View>
        </Card>
      ))}

      {/* SERVICES */}
      <SectionHeader
        eyebrow="What we do"
        title="Full-spectrum digital engineering"
        description="From the first pixel to the last line of enterprise code."
      />
      {services.isLoading ? <SkeletonRows count={3} /> : null}
      {services.isError && !serviceCards.length ? (
        <ErrorView error={services.error} onRetry={() => services.refetch()} />
      ) : null}
      <View style={styles.stack}>
        {serviceCards.map(item => (
          <Card key={item.title} onPress={() => navigation.navigate('Services')} style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Icon name="layers" size={18} color={colors.goldPrimary} />
            </View>
            <View style={styles.flex1}>
              <Text variant="rowTitle">{item.title}</Text>
              <Text variant="muted" numberOfLines={2}>
                {item.body}
              </Text>
            </View>
            <Icon name="arrow-up-right" size={18} color={colors.textTertiary} />
          </Card>
        ))}
      </View>

      {/* WORK */}
      <SectionHeader eyebrow="Selected work" title="Results clients can point to" />
      {work.isLoading ? <SkeletonRows count={2} /> : null}
      {work.data?.map(item => (
        <Card
          key={item.id}
          padded={false}
          style={styles.projectCard}
          onPress={() => navigation.navigate('PortfolioDetail', { slug: item.slug, title: item.title })}>
          {item.cover_image_url ? (
            <Image source={{ uri: item.cover_image_url }} style={styles.projectImage} />
          ) : null}
          <View style={styles.projectBody}>
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
      {!work.isLoading && !work.data?.length
        ? ONGOING_PROJECTS.map(project => (
            <Card key={project.name} style={styles.serviceCard} onPress={() => Linking.openURL(project.url)}>
              <View style={styles.flex1}>
                <View style={styles.inlineRow}>
                  <Text variant="rowTitle">{project.name}</Text>
                  <Badge label="In build" tone="neutral" />
                </View>
                <Text variant="muted" numberOfLines={2}>
                  {project.description}
                </Text>
              </View>
              <Icon name="external-link" size={16} color={colors.textTertiary} />
            </Card>
          ))
        : null}

      {/* PROCESS */}
      <SectionHeader eyebrow="Our process" title="A clear path from idea to launch" />
      <View style={styles.stack}>
        {PROCESS.map(p => (
          <View key={p.step} style={styles.processRow}>
            <Text variant="title" tone="tertiary" style={styles.processStep}>
              {p.step}
            </Text>
            <View style={styles.flex1}>
              <Text variant="rowTitle">{p.title}</Text>
              <Text variant="muted">{p.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Card variant="gold" style={styles.cta}>
        <Text variant="sectionTitle" center>
          Ready to turn your idea into a digital brand?
        </Text>
        <Text variant="body" center>
          Tell us what you're building. We reply within one business day with a plan and a timeline.
        </Text>
        <Button
          title="Get a free consultation"
          icon="arrow-right"
          onPress={() => Linking.openURL(CONTACT.whatsappHref)}
        />
        <Button title="Read our story" variant="ghost" onPress={() => navigation.navigate('Story')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  points: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  point: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  milestone: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stack: {
    gap: spacing.sm,
  },
  serviceCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  serviceIcon: {
    alignItems: 'center',
    borderColor: colors.borderAccent,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  flex1: {
    flex: 1,
    gap: 3,
  },
  inlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  projectCard: {
    marginBottom: spacing.sm,
  },
  projectImage: {
    backgroundColor: colors.surface,
    height: 170,
    width: '100%',
  },
  projectBody: {
    gap: 4,
    padding: spacing.md,
  },
  processRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  processStep: {
    opacity: 0.5,
  },
  cta: {
    alignItems: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});

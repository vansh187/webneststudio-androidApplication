import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Text } from '../../components/Text';
import { useAdminProjects } from '../../features/projects/adminProjectQueries';
import type { ProjectLifecycleStatus } from '../../types/api';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { formatDate } from '../../utils/format';

type Nav = ReturnType<typeof useNavigation<any>>;

const FILTERS: Array<{ label: string; value: ProjectLifecycleStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'On hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

const STATUS_TONE: Record<ProjectLifecycleStatus, 'gold' | 'success' | 'neutral'> = {
  active: 'gold',
  on_hold: 'neutral',
  completed: 'success',
  archived: 'neutral',
};

export function AdminProjectListScreen() {
  const navigation = useNavigation<Nav>();
  const [status, setStatus] = useState<ProjectLifecycleStatus | undefined>(undefined);
  const query = useAdminProjects({ status });
  const projects = useMemo(() => query.data?.projects ?? [], [query.data]);

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()}>
      <SectionHeader
        eyebrow="Admin"
        title="Client projects"
        description="Assign new projects and drive them through the SDLC pipeline."
      />

      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = f.value === status;
          return (
            <Pressable
              key={f.label}
              onPress={() => setStatus(f.value)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text variant="caption" tone={active ? 'onGold' : 'secondary'} style={styles.chipText}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <LoadingView label="Loading projects" />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={() => query.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyView message="No projects match this filter." />
      ) : (
        <View style={styles.list}>
          {projects.map(project => (
            <Card
              key={project.id}
              variant="elevated"
              style={styles.projectCard}
              onPress={() => navigation.navigate('AdminProjectDetail', { projectId: project.id })}>
              <View style={styles.rowTop}>
                <View style={styles.flex1}>
                  <Text variant="rowTitle" numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {project.client_name || project.client_email} · {project.client_email}
                  </Text>
                </View>
                <Badge label={project.current_stage_label} tone={STATUS_TONE[project.status]} />
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${project.progress_percent}%` }]} />
              </View>
              <Text variant="caption" tone="tertiary">
                {project.progress_percent}% · updated {formatDate(project.updated_at)}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Assign a new project"
        onPress={() => navigation.navigate('AdminAssignProject')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <Icon name="plus" size={24} color={colors.textOnGold} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  chipText: {
    fontWeight: '600',
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  projectCard: {
    gap: spacing.sm,
  },
  rowTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
    gap: 2,
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    height: '100%',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    bottom: spacing.lg,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    shadowColor: colors.goldBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: 56,
  },
  fabPressed: {
    opacity: 0.85,
  },
});

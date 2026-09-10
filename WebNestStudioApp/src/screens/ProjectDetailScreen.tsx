import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { getHttpStatus } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ProjectErrorBoundary } from '../components/ProjectErrorBoundary';
import { ProjectPipeline } from '../components/ProjectPipeline';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyView, ErrorView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { useMyProject } from '../features/projects/projectQueries';
import type { ProjectLifecycleStatus } from '../types/api';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { formatDate } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'ProjectDetail'>;

const STATUS_LABEL: Record<ProjectLifecycleStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function ProjectDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<any>();
  const projectId = route.params?.projectId;
  const query = useMyProject(projectId);
  const project = query.data;

  const openChat = useCallback(() => {
    const conversationId = project?.conversation_id;
    if (!conversationId) {
      return;
    }
    // Cross-navigator jump: root stack -> MainTabs -> Chat tab -> ChatRoom.
    navigation.navigate('MainTabs', {
      screen: 'Chat',
      params: {
        screen: 'ChatRoom',
        params: { conversationId, title: project?.name },
      },
    });
  }, [navigation, project]);

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()}>
      <ProjectErrorBoundary
        variant="screen"
        label="This project"
        onRetry={() => query.refetch()}>
        {!projectId ? (
          <EmptyView message="This project isn't available." />
        ) : query.isLoading ? (
          <LoadingView label="Loading project" />
        ) : query.isError ? (
          getHttpStatus(query.error) === 404 ? (
            <EmptyView message="This project isn't available anymore." />
          ) : (
            <ErrorView error={query.error} onRetry={() => query.refetch()} />
          )
        ) : !project ? (
          <EmptyView message="This project isn't available." />
        ) : (
          <View style={styles.content}>
            <SectionHeader
              eyebrow="Project"
              title={project.name}
              description={project.summary ?? undefined}
            />

            <View style={styles.statusRow}>
              <Badge
                label={STATUS_LABEL[project.status]}
                tone={project.status === 'completed' ? 'success' : 'neutral'}
              />
              <Text variant="caption" tone="tertiary">
                Updated {formatDate(project.updated_at)}
              </Text>
            </View>

            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHead}>
                <Text variant="label" tone="gold">
                  Progress
                </Text>
                <Text variant="caption" tone="tertiary">
                  {project.progress_percent}%
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${project.progress_percent}%` }]} />
              </View>
              <Text variant="caption" tone="tertiary">
                Current stage · {project.current_stage_label}
              </Text>
            </Card>

            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHead}>
                <Text variant="label" tone="gold">
                  SDLC pipeline
                </Text>
                <Icon name="git-branch" size={15} color={colors.goldPrimary} />
              </View>
              <ProjectPipeline stages={project.stages} variant="full" />
            </Card>

            {project.conversation_id ? (
              <View style={styles.chatBlock}>
                <Button
                  title="Open project team chat"
                  icon="message-circle"
                  onPress={openChat}
                />
                <Text variant="caption" tone="tertiary" center>
                  Add your team from the chat's Details screen.
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="tertiary">
                A team chat will appear here once WebNest sets it up.
              </Text>
            )}
          </View>
        )}
      </ProjectErrorBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 8,
    marginTop: spacing.xs,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    height: '100%',
  },
  chatBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

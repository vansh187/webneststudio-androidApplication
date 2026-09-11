import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { getErrorMessage, getHttpStatus } from '../../api/client';
import { showAlert } from '../../components/AppAlert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView';
import { Text } from '../../components/Text';
import {
  useAdminProject,
  useUpdateAdminProject,
  useUpdateAdminProjectStage,
  useArchiveAdminProject,
} from '../../features/projects/adminProjectQueries';
import type { ProjectLifecycleStatus, ProjectStage, ProjectStageState } from '../../types/api';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { formatDate } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'AdminProjectDetail'>;
type Nav = ReturnType<typeof useNavigation<any>>;

const STATE_LABEL: Record<ProjectStageState, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

const STATUS_LABEL: Record<ProjectLifecycleStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function AdminProjectDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<Nav>();
  const projectId = route.params?.projectId;
  const query = useAdminProject(projectId);
  const project = query.data;

  const updateProject = useUpdateAdminProject(projectId ?? '');
  const updateStage = useUpdateAdminProjectStage(projectId ?? '');
  const archiveProject = useArchiveAdminProject();

  const [pinnedProgress, setPinnedProgress] = useState('');

  useEffect(() => {
    setPinnedProgress(project?.progress_percent != null ? String(project.progress_percent) : '');
  }, [project?.progress_percent]);

  const setStageState = useCallback(
    async (stage: ProjectStage, state: ProjectStageState) => {
      try {
        await updateStage.mutateAsync({ stageKey: stage.key, state });
      } catch (err) {
        showAlert("Couldn't update stage", getErrorMessage(err));
      }
    },
    [updateStage],
  );

  const savePinnedProgress = useCallback(async () => {
    const trimmed = pinnedProgress.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      showAlert('Invalid value', 'Progress must be a whole number between 0 and 100, or blank.');
      return;
    }
    try {
      await updateProject.mutateAsync({ progress_percent: value });
    } catch (err) {
      showAlert("Couldn't update progress", getErrorMessage(err));
    }
  }, [pinnedProgress, updateProject]);

  const setStatus = useCallback(
    async (status: ProjectLifecycleStatus) => {
      try {
        await updateProject.mutateAsync({ status });
      } catch (err) {
        showAlert("Couldn't update status", getErrorMessage(err));
      }
    },
    [updateProject],
  );

  const openChat = useCallback(() => {
    const conversationId = project?.conversation_id;
    if (!conversationId) {
      return;
    }
    navigation.navigate('MainTabs', {
      screen: 'Chat',
      params: { screen: 'ChatRoom', params: { conversationId, title: project?.name } },
    });
  }, [navigation, project]);

  const createChat = useCallback(async () => {
    try {
      await updateProject.mutateAsync({ create_conversation: true });
    } catch (err) {
      showAlert("Couldn't create chat", getErrorMessage(err));
    }
  }, [updateProject]);

  const archive = useCallback(() => {
    if (!projectId) {
      return;
    }
    showAlert('Archive project', `Archive "${project?.name}"? The client stops seeing it as active.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveProject.mutateAsync(projectId);
            navigation.goBack();
          } catch (err) {
            showAlert("Couldn't archive", getErrorMessage(err));
          }
        },
      },
    ]);
  }, [archiveProject, navigation, project?.name, projectId]);

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()}>
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
            eyebrow="Admin"
            title={project.name}
            description={`${project.client_name || project.client_email} · ${project.client_email}`}
          />

          <View style={styles.statusRow}>
            {(Object.keys(STATUS_LABEL) as ProjectLifecycleStatus[]).map(s => {
              const selected = s === project.status;
              return (
                <Pressable key={s} onPress={() => setStatus(s)} disabled={updateProject.isPending}>
                  <Badge label={STATUS_LABEL[s]} tone={selected ? 'gold' : 'neutral'} />
                </Pressable>
              );
            })}
          </View>
          <Text variant="caption" tone="tertiary">
            Updated {formatDate(project.updated_at)}
          </Text>

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
            <View style={styles.pinRow}>
              <View style={styles.pinInput}>
                <FormInput
                  label="Pin percent (blank = auto)"
                  keyboardType="number-pad"
                  value={pinnedProgress}
                  onChangeText={setPinnedProgress}
                />
              </View>
              <Button
                title="Save"
                fullWidth={false}
                loading={updateProject.isPending}
                onPress={savePinnedProgress}
                style={styles.pinSave}
              />
            </View>
          </Card>

          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHead}>
              <Text variant="label" tone="gold">
                SDLC pipeline
              </Text>
              <Icon name="git-branch" size={15} color={colors.goldPrimary} />
            </View>
            <View style={styles.pipeline}>
              {project.stages.map(stage => (
                <StageRow key={stage.key} stage={stage} onSetState={setStageState} busy={updateStage.isPending} />
              ))}
            </View>
          </Card>

          {project.conversation_id ? (
            <Button title="Open project team chat" icon="message-circle" onPress={openChat} />
          ) : (
            <Button
              title="Create team chat"
              variant="outline"
              icon="message-circle"
              loading={updateProject.isPending}
              onPress={createChat}
            />
          )}

          {project.status !== 'archived' ? (
            <Button title="Archive project" variant="outline" icon="archive" onPress={archive} style={styles.archiveBtn} />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function StageRow({
  stage,
  onSetState,
  busy,
}: {
  stage: ProjectStage;
  onSetState: (stage: ProjectStage, state: ProjectStageState) => void;
  busy: boolean;
}) {
  return (
    <View style={styles.stageRow}>
      <View style={styles.stageHead}>
        <Text variant="rowTitle">{stage.label}</Text>
        {stage.note ? (
          <Text variant="caption" tone="secondary" style={styles.stageNote}>
            {stage.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.stateChips}>
        {(Object.keys(STATE_LABEL) as ProjectStageState[]).map(s => {
          const selected = s === stage.state;
          return (
            <Pressable
              key={s}
              disabled={busy}
              onPress={() => onSetState(stage, s)}
              style={[styles.stateChip, selected && styles.stateChipActive]}>
              <Text variant="caption" tone={selected ? 'onGold' : 'tertiary'} style={styles.stateChipText}>
                {STATE_LABEL[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    height: '100%',
  },
  pinRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pinInput: {
    flex: 1,
  },
  pinSave: {
    marginBottom: 2,
  },
  pipeline: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stageRow: {
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  stageHead: {
    gap: 2,
  },
  stageNote: {
    marginTop: 2,
  },
  stateChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stateChip: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  stateChipActive: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  stateChipText: {
    fontWeight: '600',
  },
  archiveBtn: {
    marginTop: spacing.xs,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';

import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ProjectErrorBoundary } from '../components/ProjectErrorBoundary';
import { ProjectPipeline } from '../components/ProjectPipeline';
import { Screen } from '../components/Screen';
import { Select } from '../components/Select';
import { EmptyView, ErrorView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { CONTACT } from '../data/content';
import { useAuth } from '../features/auth/AuthContext';
import { BiometricToggle } from '../features/auth/BiometricToggle';
import { clearAvatar, getAvatar, setAvatar } from '../features/profile/avatarStore';
import { deriveStages } from '../features/projects/normalize';
import { useMyProjects } from '../features/projects/projectQueries';
import {
  getSelectedProjectId,
  setSelectedProjectId,
} from '../features/projects/selectedProject';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { openExternal } from '../utils/linking';
import { formatDate, initials } from '../utils/format';

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.7 as const,
  includeBase64: true,
};

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();

  const projectsQuery = useMyProjects();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projectIdsKey = projects.map(p => p.id).join('|');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Hydrate the persisted project choice once the list is known; fall back to
  // the most recently updated project if the stored id is gone.
  useEffect(() => {
    if (projects.length === 0) {
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    getSelectedProjectId().then(stored => {
      if (cancelled) {
        return;
      }
      const valid = stored && projects.some(p => p.id === stored) ? stored : projects[0].id;
      setSelectedId(valid);
    });
    return () => {
      cancelled = true;
    };
    // projectIdsKey captures list identity without re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey]);

  const selectedProject =
    projects.find(p => p.id === selectedId) ?? projects[0] ?? null;

  const onPickProject = useCallback(
    (name: string) => {
      const match = projects.find(p => p.name === name);
      if (!match) {
        return;
      }
      setSelectedId(match.id);
      setSelectedProjectId(match.id);
    },
    [projects],
  );

  const openSelectedProject = useCallback(() => {
    if (selectedProject) {
      navigation.navigate('ProjectDetail', { projectId: selectedProject.id });
    }
  }, [navigation, selectedProject]);

  const [avatar, setAvatarState] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    getAvatar().then(setAvatarState);
  }, []);

  const handlePicked = useCallback((res: ImagePickerResponse) => {
    if (res.didCancel) {
      return;
    }
    if (res.errorCode) {
      showAlert('Could not open', res.errorMessage || 'Please try again.');
      return;
    }
    const asset = res.assets?.[0];
    if (!asset?.base64) {
      return;
    }
    const uri = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
    setAvatarState(uri);
    setAvatar(uri);
  }, []);

  const runPicker = useCallback(
    async (kind: 'camera' | 'library') => {
      setAvatarBusy(true);
      try {
        const res =
          kind === 'camera'
            ? await launchCamera({ ...PICKER_OPTIONS, saveToPhotos: false })
            : await launchImageLibrary({ ...PICKER_OPTIONS, selectionLimit: 1 });
        handlePicked(res);
      } catch {
        showAlert('Could not open', 'Please try again.');
      } finally {
        setAvatarBusy(false);
      }
    },
    [handlePicked],
  );

  const changePhoto = useCallback(() => {
    // "Remove" is surfaced as its own inline control below the avatar.
    showAlert('Profile photo', 'Update the photo shown on your client profile.', [
      { text: 'Take photo', onPress: () => runPicker('camera') },
      { text: 'Choose from library', onPress: () => runPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [runPicker]);

  const removePhoto = useCallback(() => {
    setAvatarState(null);
    clearAvatar();
  }, []);

  return (
    <Screen
      refreshing={projectsQuery.isFetching}
      onRefresh={() => projectsQuery.refetch()}>
      <View style={styles.identity}>
        <Pressable
          onPress={changePhoto}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo">
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <Text variant="sectionTitle" tone="gold">
              {initials(auth.user?.full_name)}
            </Text>
          )}
          <View style={styles.avatarBadge}>
            {avatarBusy ? (
              <ActivityIndicator size="small" color={colors.textOnGold} />
            ) : (
              <Icon name="camera" size={13} color={colors.textOnGold} />
            )}
          </View>
        </Pressable>
        <View style={styles.flex1}>
          <Text variant="rowTitle">{auth.user?.full_name || 'Client'}</Text>
          <Text variant="muted">{auth.user?.email}</Text>
          {auth.user?.role ? <Badge label={auth.user.role} tone="neutral" /> : null}
        </View>
      </View>

      <View style={styles.photoActions}>
        <Pressable onPress={changePhoto}>
          <Text variant="caption" tone="gold" style={styles.changeLink}>
            {avatar ? 'Change photo' : 'Add a profile photo'}
          </Text>
        </Pressable>
        {avatar ? (
          <Pressable onPress={removePhoto}>
            <Text variant="caption" tone="tertiary" style={styles.changeLink}>
              Remove
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardHead}>
          <Text variant="label" tone="gold">
            Project progress
          </Text>
          <Icon name="activity" size={16} color={colors.goldPrimary} />
        </View>

        <ProjectErrorBoundary
          variant="inline"
          label="Project progress"
          onRetry={() => projectsQuery.refetch()}>
          {projectsQuery.isLoading ? (
            <LoadingView label="Fetching projects" />
          ) : projectsQuery.isError ? (
            <ErrorView
              error={projectsQuery.error}
              onRetry={() => projectsQuery.refetch()}
            />
          ) : !selectedProject ? (
            /* A client with no project is a normal state, never a red error. */
            <EmptyView message="No projects found." />
          ) : (
            <View style={styles.projectBlock}>
              {projects.length > 1 ? (
                <Select
                  label="Project"
                  options={projects.map(p => p.name)}
                  value={selectedProject.name}
                  onChange={onPickProject}
                />
              ) : null}

              <Pressable
                onPress={openSelectedProject}
                accessibilityRole="button"
                accessibilityLabel={`Open ${selectedProject.name}`}
                style={({ pressed }) => [
                  styles.projectTap,
                  pressed && styles.projectTapPressed,
                ]}>
                <View style={styles.projectHeadRow}>
                  <Text variant="rowTitle" style={styles.flex1}>
                    {selectedProject.name}
                  </Text>
                  <Icon name="chevron-right" size={18} color={colors.textTertiary} />
                </View>
                <Text variant="body">{selectedProject.current_stage_label}</Text>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${selectedProject.progress_percent}%` }]}
                  />
                </View>
                <Text variant="caption" tone="tertiary">
                  {selectedProject.progress_percent}% complete · updated{' '}
                  {formatDate(selectedProject.updated_at)}
                </Text>
                <ProjectPipeline
                  stages={deriveStages(selectedProject.current_stage)}
                  variant="compact"
                />
              </Pressable>
            </View>
          )}
        </ProjectErrorBoundary>
      </Card>

      <View style={styles.security}>
        <BiometricToggle />
      </View>

      <View style={styles.links}>
        <LinkRow icon="book-open" label="Our story & vision" onPress={() => navigation.navigate('Story')} />
        <LinkRow icon="grid" label="Services catalogue" onPress={() => navigation.navigate('Services')} />
        <LinkRow icon="message-circle" label="Chat on WhatsApp" onPress={() => openExternal(CONTACT.whatsappHref)} />
        <LinkRow icon="phone" label={CONTACT.phone} onPress={() => openExternal(CONTACT.phoneHref)} />
        <LinkRow
          icon="credit-card"
          label="Visiting card"
          onPress={() => navigation.navigate('VisitingCard')}
        />
      </View>

      <Button
        title="Log out"
        variant="outline"
        icon="log-out"
        onPress={() => auth.logout().catch(() => showAlert('Could not log out'))}
      />
    </Screen>
  );
}

function LinkRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.linkRow}>
      <Icon name={icon} size={17} color={colors.goldPrimary} />
      <Text variant="body" tone="primary" style={styles.flex1}>
        {label}
      </Text>
      <Icon name="chevron-right" size={18} color={colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderAccent,
    borderRadius: 40,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    overflow: 'visible',
    width: 76,
  },
  avatarImage: {
    borderRadius: 38,
    height: '100%',
    width: '100%',
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderColor: colors.bgBase,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: -2,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 26,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  changeLink: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  flex1: { flex: 1, gap: 4 },
  card: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectBlock: {
    gap: spacing.sm,
  },
  projectTap: {
    gap: spacing.xs,
  },
  projectTapPressed: {
    opacity: 0.85,
  },
  projectHeadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
  security: {
    marginTop: spacing.lg,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});

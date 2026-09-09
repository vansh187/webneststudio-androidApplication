import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';

import { webnestApi } from '../api/webnestApi';
import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { EmptyView, LoadingView } from '../components/StateView';
import { Text } from '../components/Text';
import { CONTACT } from '../data/content';
import { useAuth } from '../features/auth/AuthContext';
import { clearAvatar, getAvatar, setAvatar } from '../features/profile/avatarStore';
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
  const status = useQuery({
    queryKey: ['me', 'project-status'],
    queryFn: webnestApi.projectStatus,
    enabled: auth.isAuthenticated,
    // A missing project 404s — that's an expected "no project" state, so don't
    // burn retries on it and don't surface it as a failure.
    retry: false,
  });

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

  const percent = Math.max(0, Math.min(100, status.data?.percent_complete ?? 0));

  return (
    <Screen refreshing={status.isFetching} onRefresh={() => status.refetch()}>
      <View style={styles.identity}>
        <Pressable onPress={changePhoto} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
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
        {status.isLoading ? <LoadingView label="Fetching status" /> : null}
        {!status.isLoading && status.data ? (
          <>
            <Text variant="rowTitle">{status.data.project_name || 'WebNest project'}</Text>
            <Text variant="body">{status.data.phase || 'Phase will appear here once updated.'}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
            <Text variant="caption" tone="tertiary">
              {percent}% complete · updated {formatDate(status.data.updated_at)}
            </Text>
          </>
        ) : null}
        {/* No project (or the endpoint 404s for this client) is a normal state,
            not an error — show a calm message, never a red "request failed". */}
        {!status.isLoading && !status.data ? <EmptyView message="No projects found." /> : null}
      </Card>

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

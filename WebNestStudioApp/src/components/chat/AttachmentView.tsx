import React, { useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import type { MessageAttachment } from '../../types/api';
import { showAlert } from '../AppAlert';
import { Text } from '../Text';
import { fileSize } from '../../utils/chatTime';

type Props = {
  attachment?: MessageAttachment | null;
  own?: boolean;
};

async function openExternally(url?: string | null) {
  if (!url) {
    showAlert("Can't open this file", 'The link has expired — reopen the chat and try again.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    showAlert("Can't open this file", 'No app on your device can open it.');
  }
}

export function AttachmentView({ attachment, own = false }: Props) {
  const [preview, setPreview] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const kind =
    attachment.kind === 'image' ||
    attachment.kind === 'pdf' ||
    attachment.kind === 'video' ||
    attachment.kind === 'audio'
      ? attachment.kind
      : 'file';
  const name = attachment.name || 'attachment';

  if (kind === 'image' && attachment.url && !imageBroken) {
    return (
      <>
        <Pressable onPress={() => setPreview(true)} style={styles.imageWrap}>
          <Image
            source={{ uri: attachment.url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageBroken(true)}
          />
        </Pressable>
        <Modal visible={preview} transparent animationType="fade" onRequestClose={() => setPreview(false)}>
          <Pressable style={styles.viewer} onPress={() => setPreview(false)}>
            <Image
              source={{ uri: attachment.url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
            <View style={styles.viewerClose}>
              <Icon name="x" size={22} color={colors.textPrimary} />
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <Pressable
      onPress={() => openExternally(attachment.url)}
      style={[styles.fileChip, own && styles.fileChipOwn]}>
      <View style={[styles.fileIcon, own && styles.fileIconOwn]}>
        <Icon
          name={
            kind === 'pdf'
              ? 'file-text'
              : kind === 'video'
              ? 'video'
              : kind === 'audio'
              ? 'music'
              : 'file'
          }
          size={18}
          color={own ? colors.textOnGold : colors.goldPrimary}
        />
      </View>
      <View style={styles.fileMeta}>
        <Text
          variant="bodyStrong"
          tone={own ? 'onGold' : 'primary'}
          numberOfLines={1}
          style={styles.fileName}>
          {name}
        </Text>
        <Text variant="caption" tone={own ? 'onGold' : 'tertiary'}>
          {kind.toUpperCase()} · {fileSize(attachment.size_bytes)}
        </Text>
      </View>
      <Icon name="download" size={16} color={own ? colors.textOnGold : colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: radii.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  image: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
    width: 220,
  },
  viewer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.94)',
    flex: 1,
    justifyContent: 'center',
  },
  viewerImage: {
    height: '82%',
    width: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xxl,
  },
  fileChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    maxWidth: 260,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fileChipOwn: {
    backgroundColor: 'rgba(5,6,9,0.14)',
    borderColor: 'rgba(5,6,9,0.18)',
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fileIconOwn: {
    backgroundColor: 'rgba(5,6,9,0.16)',
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 13,
  },
});

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import {
  MAX_ATTACHMENTS,
  pickDocuments,
  pickFromCamera,
  pickFromLibrary,
  type PickedFile,
} from '../../api/filePicker';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { font } from '../../theme/typography';
import type { ChatMessage } from '../../types/api';
import { showAlert } from '../AppAlert';
import { Text } from '../Text';
import { ActionRowSheet } from './ActionRowSheet';
import { EmojiPickerSheet } from './EmojiPickerSheet';

type Props = {
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onPickedFiles: (files: PickedFile[]) => void;
  sending: boolean;
  statusHint?: string | null;
  disabled?: boolean;
  /** Safe-area bottom inset so the send button clears the nav bar. */
  bottomInset?: number;
};

const MAX_LEN = 4000;

export function Composer({
  replyingTo,
  onCancelReply,
  onSendText,
  onPickedFiles,
  sending,
  statusHint,
  disabled = false,
  bottomInset = 0,
}: Props) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending && !disabled;

  const submit = () => {
    if (!canSend) {
      return;
    }
    onSendText(trimmed.slice(0, MAX_LEN));
    setText('');
  };

  const runPicker = async (fn: () => Promise<{ files: PickedFile[]; rejected: string[]; cancelled: boolean }>) => {
    try {
      const result = await fn();
      if (result.rejected.length) {
        showAlert('Some files were skipped', result.rejected.join('\n'));
      }
      if (result.files.length) {
        onPickedFiles(result.files.slice(0, MAX_ATTACHMENTS));
      }
    } catch {
      showAlert("Couldn't attach that", 'Please try again.');
    }
  };

  return (
    <View style={[styles.wrap, { paddingBottom: spacing.sm + bottomInset }]}>
      {replyingTo ? (
        <View style={styles.replyStrip}>
          <View style={styles.replyBar} />
          <View style={styles.replyBody}>
            <Text variant="caption" tone="gold" numberOfLines={1} style={styles.replyName}>
              Replying to {replyingTo.sender?.full_name || replyingTo.sender?.email || 'message'}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {replyingTo.is_deleted
                ? 'Message deleted'
                : replyingTo.body || (replyingTo.attachments?.length ? 'Attachment' : '')}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={10} style={styles.replyClose}>
            <Icon name="x" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      ) : null}

      {statusHint ? (
        <View style={styles.hint}>
          <ActivityIndicator size="small" color={colors.goldPrimary} />
          <Text variant="caption" tone="tertiary">
            {statusHint}
          </Text>
        </View>
      ) : null}

      <View style={styles.bar}>
        <Pressable
          onPress={() => setAttachOpen(true)}
          hitSlop={8}
          disabled={disabled}
          style={styles.iconBtn}>
          <Icon name="plus" size={22} color={colors.goldPrimary} />
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={t => setText(t.slice(0, MAX_LEN))}
            placeholder="Message"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.goldPrimary}
            multiline
            editable={!disabled}
            style={styles.input}
          />
          <Pressable onPress={() => setEmojiOpen(true)} hitSlop={8} style={styles.emojiBtn}>
            <Icon name="smile" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendBtnOff]}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.textOnGold} />
          ) : (
            <Icon name="arrow-up" size={20} color={colors.textOnGold} />
          )}
        </Pressable>
      </View>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={e => setText(prev => (prev + e).slice(0, MAX_LEN))}
      />

      <ActionRowSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        title="Attach"
        actions={[
          { key: 'photo', label: 'Photo / Video', icon: 'image', onPress: () => runPicker(pickFromLibrary) },
          { key: 'camera', label: 'Camera', icon: 'camera', onPress: () => runPicker(pickFromCamera) },
          { key: 'file', label: 'Document / Audio', icon: 'file-text', onPress: () => runPicker(pickDocuments) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgBase,
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  replyStrip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  replyBar: {
    alignSelf: 'stretch',
    backgroundColor: colors.goldPrimary,
    borderRadius: radii.pill,
    width: 3,
  },
  replyBody: {
    flex: 1,
    gap: 1,
  },
  replyName: {
    fontWeight: '700',
  },
  replyClose: {
    padding: 2,
  },
  hint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  bar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 36,
  },
  inputWrap: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    maxHeight: 130,
    minHeight: 44,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.sans,
    fontSize: 16,
    maxHeight: 120,
    paddingBottom: 10,
    paddingTop: 10,
  },
  emojiBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 32,
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendBtnOff: {
    opacity: 0.4,
  },
});

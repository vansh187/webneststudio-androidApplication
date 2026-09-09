import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, gradients } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import type { ChatMessage } from '../../types/api';
import { messageTime } from '../../utils/chatTime';
import { Gradient } from '../Gradient';
import { Text } from '../Text';
import { AttachmentView } from './AttachmentView';

type Props = {
  message: ChatMessage;
  own: boolean;
  showSender: boolean;
  onLongPress: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
};

function senderName(message: ChatMessage): string {
  return message?.sender?.full_name || message?.sender?.email || 'Someone';
}

export function MessageBubble({
  message,
  own,
  showSender,
  onLongPress,
  onToggleReaction,
}: Props) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const deleted = Boolean(message.is_deleted);
  const body = typeof message.body === 'string' ? message.body : '';
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const reply = message.reply_to && typeof message.reply_to === 'object' ? message.reply_to : null;

  return (
    <View style={[styles.row, own ? styles.rowOwn : styles.rowOther]}>
      <View style={styles.column}>
        {showSender && !own ? (
          <Text variant="caption" tone="gold" style={styles.sender}>
            {senderName(message)}
          </Text>
        ) : null}

        <Pressable
          onLongPress={() => {
            if (!deleted) {
              onLongPress(message);
            }
          }}
          delayLongPress={280}
          style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
          {own && !deleted ? (
            <Gradient
              colors={gradients.goldMetal}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {reply ? (
            <View style={[styles.reply, own && styles.replyOwn]}>
              <Text
                variant="caption"
                tone={own ? 'onGold' : 'gold'}
                numberOfLines={1}
                style={styles.replyName}>
                {reply.sender?.full_name || reply.sender?.email || 'Reply'}
              </Text>
              <Text
                variant="caption"
                tone={own ? 'onGold' : 'secondary'}
                numberOfLines={1}>
                {reply.is_deleted ? 'Message deleted' : reply.body_preview || 'Attachment'}
              </Text>
            </View>
          ) : null}

          {deleted ? (
            <Text variant="body" tone={own ? 'onGold' : 'tertiary'} style={styles.deleted}>
              This message was deleted
            </Text>
          ) : (
            <>
              {attachments.map((att, i) => (
                <AttachmentView key={`${att?.url_path || i}`} attachment={att} own={own} />
              ))}
              {body ? (
                <Text variant="body" tone={own ? 'onGold' : 'primary'} style={styles.body}>
                  {body}
                </Text>
              ) : null}
            </>
          )}

          <Text
            variant="caption"
            tone={own ? 'onGold' : 'tertiary'}
            style={styles.time}>
            {messageTime(message.created_at)}
            {message.edited_at ? ' · edited' : ''}
          </Text>
        </Pressable>

        {reactions.length ? (
          <View style={[styles.reactions, own ? styles.reactionsOwn : styles.reactionsOther]}>
            {reactions.map((r, i) => {
              const emoji = r?.emoji || '';
              const count = Number.isFinite(r?.count) ? r.count : 0;
              if (!emoji) {
                return null;
              }
              return (
                <Pressable
                  key={`${emoji}-${i}`}
                  onPress={() => onToggleReaction(message, emoji)}
                  style={[styles.chip, r?.reacted_by_me && styles.chipActive]}>
                  <Text style={styles.chipGlyph}>{emoji}</Text>
                  {count > 1 ? (
                    <Text variant="caption" tone={r?.reacted_by_me ? 'gold' : 'tertiary'}>
                      {count}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: spacing.md,
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  column: {
    maxWidth: '82%',
  },
  sender: {
    marginBottom: 2,
    marginLeft: spacing.sm,
  },
  bubble: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    borderBottomRightRadius: radii.xs,
    borderColor: colors.goldEdge,
    borderWidth: 1,
  },
  bubbleOther: {
    backgroundColor: colors.bgElevated,
    borderBottomLeftRadius: radii.xs,
    borderColor: colors.border,
    borderWidth: 1,
  },
  reply: {
    borderLeftColor: colors.goldPrimary,
    borderLeftWidth: 2,
    gap: 1,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  replyOwn: {
    borderLeftColor: 'rgba(5,6,9,0.5)',
  },
  replyName: {
    fontWeight: '700',
  },
  body: {
    marginTop: 2,
  },
  deleted: {
    fontStyle: 'italic',
  },
  time: {
    alignSelf: 'flex-end',
    fontSize: 10,
    marginTop: 4,
    opacity: 0.8,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionsOwn: { justifyContent: 'flex-end' },
  reactionsOther: { justifyContent: 'flex-start' },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipActive: {
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
  },
  chipGlyph: {
    fontSize: 13,
  },
});

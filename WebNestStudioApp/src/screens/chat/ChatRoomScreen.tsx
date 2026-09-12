import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '../../api/client';
import { uploadAttachments } from '../../api/uploads';
import { webnestApi } from '../../api/webnestApi';
import type { PickedFile } from '../../api/filePicker';
import { showAlert } from '../../components/AppAlert';
import { BrandBackground } from '../../components/BrandBackground';
import { ActionRowSheet, type SheetAction } from '../../components/chat/ActionRowSheet';
import { ChatErrorBoundary } from '../../components/chat/ChatErrorBoundary';
import { Composer } from '../../components/chat/Composer';
import { DateSeparator } from '../../components/chat/DateSeparator';
import { EmojiPickerSheet } from '../../components/chat/EmojiPickerSheet';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { Text } from '../../components/Text';
import { chatKeys, useConversation } from '../../features/chat/chatQueries';
import { useConversationMessages } from '../../features/chat/useConversationMessages';
import { useAuth } from '../../features/auth/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { ChatMessage, MessageAttachment } from '../../types/api';
import { dayLabel, isNewDay } from '../../utils/chatTime';
import type { ChatStackParamList } from '../../navigation/types';

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; message: ChatMessage; showSender: boolean };

function buildRows(messages: ChatMessage[], isGroup: boolean, myId?: string): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    if (isNewDay(m.created_at, prev?.created_at)) {
      rows.push({ kind: 'day', key: `day-${m.id}`, label: dayLabel(m.created_at) });
    }
    const own = Boolean(myId && m.sender?.id === myId);
    const showSender =
      isGroup && !own && (!prev || prev.sender?.id !== m.sender?.id || isNewDay(m.created_at, prev?.created_at));
    rows.push({ kind: 'msg', key: m.id, message: m, showSender });
  }
  return rows;
}

export function ChatRoomScreen() {
  const route = useRoute<RouteProp<ChatStackParamList, 'ChatRoom'>>();
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const conversationId = route.params?.conversationId;
  const headerTitle = route.params?.title;

  const { data: conversation } = useConversation(conversationId);
  const {
    messages,
    status,
    error,
    hasMoreOlder,
    loadingOlder,
    refresh,
    loadOlder,
    applyLocal,
  } = useConversationMessages(conversationId, focused);

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [reactTarget, setReactTarget] = useState<ChatMessage | null>(null);

  const myId = auth.user?.id;
  const isGroup = conversation?.type === 'group';
  const lastReadRef = useRef<string | null>(null);

  const myParticipantRole = useMemo(() => {
    const p = (conversation?.participants || []).find(x => x?.user?.id === myId);
    return p?.role ?? 'member';
  }, [conversation, myId]);

  const derivedTitle = useMemo(() => {
    if (conversation?.title) {
      return conversation.title;
    }
    // Prefer names from the loaded conversation (real emails, per the API) over
    // the param passed at navigation time (which may carry a masked email).
    const others = (conversation?.participants || []).filter(
      p => p?.user?.id && p.user.id !== myId,
    );
    if (others.length === 1) {
      return others[0].user.full_name || others[0].user.email || headerTitle || 'Direct message';
    }
    if (others.length > 1) {
      return others.map(p => p.user.full_name || p.user.email).filter(Boolean).join(', ');
    }
    return headerTitle || 'Chat';
  }, [conversation, headerTitle, myId]);

  // header
  useEffect(() => {
    const count = conversation?.participants?.length ?? 0;
    // React Navigation's headerRight is a render function by design.
    const headerRight = () =>
      isGroup ? (
        <Text
          variant="caption"
          tone="tertiary"
          onPress={() => navigation.navigate('GroupInfo', { conversationId })}
          style={styles.headerCount}>
          {count} members
        </Text>
      ) : null;
    navigation.setOptions?.({ title: derivedTitle, headerRight });
  }, [navigation, conversation, derivedTitle, isGroup, conversationId]);

  // mark read whenever the newest message changes while focused
  useEffect(() => {
    if (!focused || !conversationId || messages.length === 0) {
      return;
    }
    const newest = messages[messages.length - 1];
    if (!newest?.id || newest.id === lastReadRef.current || newest.id.startsWith('temp-')) {
      return;
    }
    lastReadRef.current = newest.id;
    webnestApi
      .markRead(conversationId, newest.id)
      .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.conversations }))
      .catch(() => {});
  }, [messages, focused, conversationId, queryClient]);

  const rows = useMemo(
    () => buildRows(messages, isGroup, myId).slice().reverse(),
    [messages, isGroup, myId],
  );

  const makeTempMessage = useCallback(
    (body: string, attachments: MessageAttachment[]): ChatMessage => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conversationId || '',
      sender: {
        id: myId || 'me',
        full_name: auth.user?.full_name ?? null,
        email: auth.user?.email ?? '',
      },
      body: body || null,
      attachments,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender: replyingTo.sender,
            body_preview: replyingTo.body ?? null,
            is_deleted: Boolean(replyingTo.is_deleted),
          }
        : null,
      reactions: [],
      is_deleted: false,
      created_at: new Date().toISOString(),
      edited_at: null,
    }),
    [conversationId, myId, auth.user, replyingTo],
  );

  const sendText = useCallback(
    async (text: string) => {
      if (!conversationId || sending) {
        return;
      }
      const replyId = replyingTo?.id;
      const temp = makeTempMessage(text, []);
      applyLocal(prev => [...prev, temp]);
      setReplyingTo(null);
      setSending(true);
      try {
        const real = await webnestApi.sendMessage(conversationId, {
          body: text,
          replyToMessageId: replyId,
        });
        applyLocal(prev => prev.map(m => (m.id === temp.id ? real : m)));
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      } catch (err) {
        applyLocal(prev => prev.filter(m => m.id !== temp.id));
        showAlert('Message not sent', getErrorMessage(err, 'Check your connection and try again.'));
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, replyingTo, makeTempMessage, applyLocal, queryClient],
  );

  const sendFiles = useCallback(
    async (files: PickedFile[]) => {
      if (!conversationId || sending || files.length === 0) {
        return;
      }
      const replyId = replyingTo?.id;
      setReplyingTo(null);
      setSending(true);
      setUploadHint(`Uploading 0/${files.length}…`);

      const previewAttachments: MessageAttachment[] = files.map(f => ({
        url_path: '',
        url: f.uri,
        name: f.name,
        mime_type: f.type,
        size_bytes: f.size,
        kind: f.kind,
        width: f.width ?? null,
        height: f.height ?? null,
      }));
      const temp = makeTempMessage('', previewAttachments);
      applyLocal(prev => [...prev, temp]);

      try {
        const { attachments, failed } = await uploadAttachments(files, (done, total) =>
          setUploadHint(`Uploading ${done}/${total}…`),
        );
        if (failed.length) {
          showAlert('Some files were not sent', failed.join('\n'));
        }
        if (attachments.length === 0) {
          applyLocal(prev => prev.filter(m => m.id !== temp.id));
          return;
        }
        const real = await webnestApi.sendMessage(conversationId, {
          attachments,
          replyToMessageId: replyId,
        });
        applyLocal(prev => prev.map(m => (m.id === temp.id ? real : m)));
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      } catch (err) {
        applyLocal(prev => prev.filter(m => m.id !== temp.id));
        showAlert('Attachment not sent', getErrorMessage(err));
      } finally {
        setSending(false);
        setUploadHint(null);
      }
    },
    [conversationId, sending, replyingTo, makeTempMessage, applyLocal, queryClient],
  );

  const toggleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!message?.id || message.id.startsWith('temp-')) {
        return;
      }
      const existing = (message.reactions || []).find(r => r?.emoji === emoji);
      const mine = Boolean(existing?.reacted_by_me);
      const snapshot = Array.isArray(message.reactions) ? message.reactions : [];

      // optimistic
      applyLocal(prev =>
        prev.map(m => {
          if (m.id !== message.id) {
            return m;
          }
          const list = [...(m.reactions || [])];
          const idx = list.findIndex(r => r.emoji === emoji);
          if (idx >= 0) {
            const cur = list[idx];
            const nextCount = Math.max(0, (cur.count || 0) + (mine ? -1 : 1));
            if (nextCount === 0) {
              list.splice(idx, 1);
            } else {
              list[idx] = { ...cur, count: nextCount, reacted_by_me: !mine };
            }
          } else {
            list.push({ emoji, count: 1, reacted_by_me: true });
          }
          return { ...m, reactions: list };
        }),
      );

      try {
        const res = mine
          ? await webnestApi.removeReaction(message.id, emoji)
          : await webnestApi.addReaction(message.id, emoji);
        if (res && Array.isArray(res.reactions)) {
          applyLocal(prev =>
            prev.map(m => (m.id === message.id ? { ...m, reactions: res.reactions } : m)),
          );
        }
      } catch {
        // Revert just this message's reactions — never reload the whole list
        // (that would discard scrolled-back history).
        applyLocal(prev =>
          prev.map(m => (m.id === message.id ? { ...m, reactions: snapshot } : m)),
        );
      }
    },
    [applyLocal],
  );

  const confirmDelete = useCallback(
    (message: ChatMessage) => {
      showAlert('Delete message', 'This removes it for everyone in the chat.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await webnestApi.deleteMessage(message.id);
              applyLocal(prev => prev.map(m => (m.id === message.id ? res : m)));
            } catch (err) {
              showAlert("Couldn't delete", getErrorMessage(err));
            }
          },
        },
      ]);
    },
    [applyLocal],
  );

  const submitReport = useCallback((message: ChatMessage, reason: string) => {
    webnestApi
      .reportMessage(message.id, reason)
      .then(() => showAlert('Reported', "Thanks — we'll review this and take action if needed."))
      .catch(err => showAlert("Couldn't send report", getErrorMessage(err)));
  }, []);

  const confirmReport = useCallback(
    (message: ChatMessage) => {
      showAlert('Report this message', 'Why are you reporting it?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport(message, 'Spam') },
        { text: 'Harassment', onPress: () => submitReport(message, 'Harassment') },
        {
          text: 'Inappropriate content',
          onPress: () => submitReport(message, 'Inappropriate content'),
        },
      ]);
    },
    [submitReport],
  );

  const openActions = useCallback((message: ChatMessage) => setActionTarget(message), []);

  const actionSheetActions = useMemo(() => {
    if (!actionTarget) {
      return [];
    }
    const own = actionTarget.sender?.id === myId;
    const canDelete = own || myParticipantRole === 'owner' || myParticipantRole === 'admin';
    const list: SheetAction[] = [
      {
        key: 'reply',
        label: 'Reply',
        icon: 'corner-up-left',
        onPress: () => setReplyingTo(actionTarget),
      },
      {
        key: 'react',
        label: 'React',
        icon: 'smile',
        onPress: () => setReactTarget(actionTarget),
      },
    ];
    if (!own && !actionTarget.is_deleted) {
      list.push({
        key: 'report',
        label: 'Report',
        icon: 'flag',
        tone: 'danger',
        onPress: () => confirmReport(actionTarget),
      });
    }
    if (canDelete) {
      list.push({
        key: 'delete',
        label: 'Delete',
        icon: 'trash-2',
        tone: 'danger',
        onPress: () => confirmDelete(actionTarget),
      });
    }
    return list;
  }, [actionTarget, myId, myParticipantRole, confirmDelete, confirmReport]);

  return (
    <ChatErrorBoundary variant="screen" label="Conversation" onRetry={refresh}>
      <BrandBackground>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={headerHeight}>
          {status === 'loading' && messages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.goldPrimary} />
            </View>
          ) : status === 'error' && messages.length === 0 ? (
            <View style={styles.center}>
              <Text variant="body" tone="secondary" center>
                {error || 'Could not load this conversation.'}
              </Text>
              <Text variant="label" tone="gold" onPress={() => refresh()} style={styles.retryLink}>
                RETRY
              </Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              inverted
              keyExtractor={item => item.key}
              renderItem={({ item }) => {
                if (item.kind === 'day') {
                  return <DateSeparator label={item.label} />;
                }
                return (
                  <ChatErrorBoundary variant="inline">
                    <MessageBubble
                      message={item.message}
                      own={Boolean(myId && item.message.sender?.id === myId)}
                      showSender={item.showSender}
                      onLongPress={openActions}
                      onToggleReaction={toggleReaction}
                    />
                  </ChatErrorBoundary>
                );
              }}
              contentContainerStyle={styles.listContent}
              onEndReached={() => {
                if (hasMoreOlder) {
                  loadOlder();
                }
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingOlder ? (
                  <View style={styles.olderLoader}>
                    <ActivityIndicator size="small" color={colors.goldPrimary} />
                  </View>
                ) : undefined
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          )}

          <Composer
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onSendText={sendText}
            onPickedFiles={sendFiles}
            sending={sending}
            statusHint={uploadHint}
            disabled={!conversationId}
            bottomInset={insets.bottom}
          />
        </KeyboardAvoidingView>
      </BrandBackground>

      <ActionRowSheet
        visible={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        actions={actionSheetActions}
      />
      <EmojiPickerSheet
        visible={Boolean(reactTarget)}
        onClose={() => setReactTarget(null)}
        compact
        onPick={emoji => {
          if (reactTarget) {
            toggleReaction(reactTarget, emoji);
          }
        }}
      />
    </ChatErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  retryLink: {
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  olderLoader: {
    paddingVertical: spacing.md,
  },
  headerCount: {
    marginRight: spacing.md,
  },
});

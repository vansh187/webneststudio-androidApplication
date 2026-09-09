import React, { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';

import { getErrorMessage } from '../../api/client';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { ChatErrorBoundary } from '../../components/chat/ChatErrorBoundary';
import { RowSeparator } from '../../components/chat/RowSeparator';
import { Screen } from '../../components/Screen';
import { EmptyView, ErrorView, SkeletonRows } from '../../components/StateView';
import { Text } from '../../components/Text';
import { useConversations } from '../../features/chat/chatQueries';
import { useAuth } from '../../features/auth/AuthContext';
import { colors } from '../../theme/colors';
import { radii, shadow, spacing } from '../../theme/spacing';
import type { Conversation } from '../../types/api';
import { conversationTime } from '../../utils/chatTime';
import type { ChatStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

function displayTitle(convo: Conversation, myId?: string): string {
  if (convo?.title) {
    return convo.title;
  }
  const others = (convo?.participants || []).filter(p => p?.user?.id && p.user.id !== myId);
  if (others.length === 1) {
    return others[0].user.full_name || others[0].user.email || 'Direct message';
  }
  if (others.length > 1) {
    return others
      .map(p => p.user.full_name || p.user.email)
      .filter(Boolean)
      .join(', ');
  }
  return 'Conversation';
}

function ConversationRow({
  convo,
  myId,
  onPress,
}: {
  convo: Conversation;
  myId?: string;
  onPress: () => void;
}) {
  const title = displayTitle(convo, myId);
  const isGroup = convo?.type === 'group';
  const last = convo?.last_message && typeof convo.last_message === 'object' ? convo.last_message : null;
  const unread = Number.isFinite(convo?.unread_count) && convo.unread_count > 0 ? convo.unread_count : 0;

  const preview = last
    ? `${last.sender_name ? `${last.sender_name.split(' ')[0]}: ` : ''}${
        last.has_attachment && !last.preview ? '📎 Attachment' : last.preview || ''
      }`
    : 'No messages yet';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <ChatAvatar name={title} group={isGroup} size={48} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.rowTitle}>
            {title}
          </Text>
          <Text variant="caption" tone="tertiary">
            {conversationTime(last?.created_at)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            variant="muted"
            tone={unread ? 'secondary' : 'tertiary'}
            numberOfLines={1}
            style={styles.preview}>
            {preview}
          </Text>
          {unread ? (
            <View style={styles.unread}>
              <Text variant="caption" tone="onGold" style={styles.unreadText}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const auth = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useConversations();

  const conversations = useMemo(
    () => (Array.isArray(data) ? data.filter(c => c && typeof c.id === 'string') : []),
    [data],
  );

  return (
    <ChatErrorBoundary variant="screen" label="Chats" onRetry={refetch}>
      <Screen scroll={false}>
        <View style={styles.header}>
          <Text variant="title">Chats</Text>
          <Text variant="muted">Project conversations — groups and direct messages.</Text>
        </View>

        {isLoading ? (
          <View style={styles.pad}>
            <SkeletonRows count={5} />
          </View>
        ) : isError && conversations.length === 0 ? (
          <View style={styles.pad}>
            <ErrorView error={error} onRetry={refetch} />
            <Text variant="caption" tone="tertiary" style={styles.hint}>
              {getErrorMessage(error)}
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ChatErrorBoundary variant="inline">
                <ConversationRow
                  convo={item}
                  myId={auth.user?.id}
                  onPress={() =>
                    navigation.navigate('ChatRoom', {
                      conversationId: item.id,
                      title: displayTitle(item, auth.user?.id),
                    })
                  }
                />
              </ChatErrorBoundary>
            )}
            ItemSeparatorComponent={RowSeparator}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => {
                  refetch();
                }}
                tintColor={colors.goldPrimary}
                colors={[colors.goldPrimary]}
              />
            }
            ListEmptyComponent={
              <EmptyView message="No conversations yet. Start one with the button below." />
            }
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={() => navigation.navigate('NewChat')}
          style={styles.fab}>
          <Icon name="edit" size={22} color={colors.textOnGold} />
        </Pressable>
      </Screen>
    </ChatErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pad: {
    paddingHorizontal: spacing.lg,
  },
  hint: {
    marginTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  rowTitle: {
    flex: 1,
  },
  rowBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
  },
  unread: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    bottom: spacing.lg,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    ...shadow.goldStrong,
  },
});

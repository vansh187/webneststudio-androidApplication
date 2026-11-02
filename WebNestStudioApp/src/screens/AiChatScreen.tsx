import React, { memo, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { MarkdownMessage } from '../components/assistant/MarkdownMessage';
import { BrandBackground } from '../components/BrandBackground';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { useAuth } from '../features/auth/AuthContext';
import { AiMessage, canSendText, countChars, MAX_USER_CHARS } from '../features/assistant/history';
import { useAssistantChat } from '../features/assistant/useAssistantChat';
import { chatAccess } from '../features/prime/access';
import { useAssistantUsage } from '../features/prime/primeQueries';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { font } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'AiChat'>;

const NEAR_BOTTOM_PX = 80;

type RowProps = {
  message: AiMessage;
  isLatest: boolean;
  onRetry: (id: string) => void;
  onNewChat: () => void;
  onContinue: () => void;
};

function MessageRowView({ message, isLatest, onRetry, onNewChat, onContinue }: RowProps) {
  if (message.role === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text selectable tone="primary">
          {message.content}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.reply}>
      {message.content ? <MarkdownMessage text={message.content} /> : null}
      {message.status === 'streaming' && !message.content ? (
        <ActivityIndicator color={colors.goldPrimary} style={styles.thinking} />
      ) : null}
      {message.status === 'failed' && message.error ? (
        <View style={styles.replyNote}>
          <Text variant="muted" tone="danger">
            {message.error}
          </Text>
          {message.action === 'retry' && isLatest ? (
            <Text variant="caption" tone="gold" onPress={() => onRetry(message.id)} style={styles.action}>
              Retry
            </Text>
          ) : null}
          {message.action === 'newChat' && isLatest ? (
            <Text variant="caption" tone="gold" onPress={onNewChat} style={styles.action}>
              New chat
            </Text>
          ) : null}
        </View>
      ) : null}
      {message.cutShort && isLatest ? (
        <View style={styles.replyNote}>
          <Text variant="muted">This reply was cut short</Text>
          <Text variant="caption" tone="gold" onPress={onContinue} style={styles.action}>
            Continue
          </Text>
        </View>
      ) : null}
      {message.provider ? (
        <Text variant="caption" tone="tertiary">
          Answered by {message.provider}
        </Text>
      ) : null}
    </View>
  );
}

// A streaming reply repaints often: finished rows shouldn't repaint with it.
const MessageRow = memo(MessageRowView);

export function AiChatScreen({ navigation }: Props) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const usage = useAssistantUsage();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<AiMessage>>(null);
  const stickToBottom = useRef(true);

  // Replace, not push: paying replaces the plan screen with a chat, and a second
  // chat underneath would overwrite the newer conversation in storage.
  const openPlan = useCallback(() => navigation.replace('PrimePlan'), [navigation]);
  const onSessionLost = useCallback(() => {
    auth.logout().catch(() => {});
    // `auth` changes identity with its state; logout is only ever read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chat = useAssistantChat({ onPaymentRequired: openPlan, onSessionLost });
  const { send } = chat;

  const state = usage.data ? chatAccess(usage.data) : null;
  const locked = state !== null && state !== 'open';
  const count = countChars(input);
  const overLimit = count > MAX_USER_CHARS;
  const canSend =
    canSendText(input) && !chat.streaming && !chat.blockedMessage && !locked && chat.hydrated;

  const submit = () => {
    if (canSend && chat.send(input)) {
      setInput('');
      stickToBottom.current = true;
    }
  };

  const onContinue = useCallback(() => {
    send('Continue');
  }, [send]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    stickToBottom.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - NEAR_BOTTOM_PX;
  };

  return (
    <BrandBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}>
        <View style={styles.topBar}>
          <Pressable
            onPress={chat.newChat}
            hitSlop={10}
            accessibilityRole="button"
            style={styles.newChat}>
            <Icon name="plus" size={14} color={colors.goldPrimary} />
            <Text variant="caption" tone="gold">
              New chat
            </Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          style={styles.flex}
          data={chat.messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (stickToBottom.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            chat.hydrated ? (
              <View style={styles.empty}>
                <Text variant="sectionTitle" center>
                  Ask WebNest AI
                </Text>
                <Text variant="body" center>
                  Ask anything. Replies can be in Hindi, Hinglish or English.
                </Text>
              </View>
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <MessageRow
              message={item}
              isLatest={index === chat.messages.length - 1}
              onRetry={chat.retry}
              onNewChat={chat.newChat}
              onContinue={onContinue}
            />
          )}
        />

        <View style={[styles.composer, { paddingBottom: spacing.sm + insets.bottom }]}>
          {locked ? (
            <View style={styles.banner}>
              <Text variant="muted" tone="primary">
                {state === 'allowanceUsed'
                  ? "You've used your full WebNest AI allowance. Buy again to keep chatting."
                  : state === 'unavailable'
                  ? 'WebNest AI is not available right now.'
                  : 'Your WebNest Prime pass has ended.'}
              </Text>
              {state !== 'unavailable' ? (
                <Button
                  title="View plan"
                  variant="outline"
                  onPress={openPlan}
                />
              ) : null}
            </View>
          ) : null}
          {chat.blockedMessage ? (
            <Text variant="muted" tone="danger" style={styles.blocked}>
              {chat.blockedMessage}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" style={styles.notice}>
            Messages are processed by an AI service. Don't share passwords or private data.
          </Text>
          <View style={styles.bar}>
            <View style={styles.inputWrap}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.goldPrimary}
                multiline
                editable={!locked}
                style={styles.input}
              />
            </View>
            {chat.streaming ? (
              <Pressable
                onPress={chat.stop}
                accessibilityRole="button"
                accessibilityLabel="Stop reply"
                style={styles.sendBtn}>
                <Icon name="square" size={16} color={colors.textOnGold} />
              </Pressable>
            ) : (
              <Pressable
                onPress={submit}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={[styles.sendBtn, !canSend && styles.sendBtnOff]}>
                <Icon name="arrow-up" size={20} color={colors.textOnGold} />
              </Pressable>
            )}
          </View>
          <Text variant="caption" tone={overLimit ? 'danger' : 'tertiary'} style={styles.counter}>
            {count}/{MAX_USER_CHARS}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    borderBottomColor: colors.hairline,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  newChat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  list: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  empty: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: '88%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reply: {
    gap: spacing.xs,
  },
  thinking: {
    alignSelf: 'flex-start',
  },
  replyNote: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    fontWeight: '700',
    paddingVertical: spacing.xxs,
  },
  composer: {
    backgroundColor: colors.bgBase,
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  banner: {
    gap: spacing.xs,
    padding: spacing.xs,
  },
  blocked: {
    paddingHorizontal: spacing.xs,
  },
  notice: {
    paddingHorizontal: spacing.xs,
  },
  bar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  inputWrap: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    maxHeight: 130,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  input: {
    color: colors.textPrimary,
    fontFamily: font.sans,
    fontSize: 16,
    maxHeight: 120,
    paddingBottom: 10,
    paddingTop: 10,
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
  counter: {
    alignSelf: 'flex-end',
    paddingRight: 52,
  },
});

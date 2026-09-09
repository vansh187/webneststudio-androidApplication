import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';

import { getErrorMessage } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import { showAlert } from '../../components/AppAlert';
import { Button } from '../../components/Button';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { ChatErrorBoundary } from '../../components/chat/ChatErrorBoundary';
import { PersonRow } from '../../components/chat/PersonRow';
import { FormInput } from '../../components/FormInput';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { chatKeys, useConversation } from '../../features/chat/chatQueries';
import { usePeopleSearch } from '../../features/chat/usePeopleSearch';
import { useAuth } from '../../features/auth/AuthContext';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import type { ChatStackParamList } from '../../navigation/types';

type Nav = ReturnType<typeof useNavigation<any>>;

export function GroupInfoScreen() {
  const route = useRoute<RouteProp<ChatStackParamList, 'GroupInfo'>>();
  const navigation = useNavigation<Nav>();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const conversationId = route.params?.conversationId;

  const { data: conversation, isLoading, isError, error, refetch } = useConversation(conversationId);

  const myId = auth.user?.id;
  const participants = useMemo(
    () => (conversation?.participants || []).filter(p => p?.user?.id),
    [conversation],
  );
  const myRole = participants.find(p => p.user.id === myId)?.role ?? 'member';
  const isManager = myRole === 'owner' || myRole === 'admin';
  const isGroup = conversation?.type === 'group';

  const [rename, setRename] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(false);
  const search = usePeopleSearch();

  useEffect(() => {
    setRename(conversation?.title ?? '');
  }, [conversation?.title]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
    queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
  };

  const saveName = async () => {
    const next = rename.trim().slice(0, 120);
    if (!next || next === conversation?.title || savingName) {
      return;
    }
    setSavingName(true);
    try {
      await webnestApi.renameConversation(conversationId, next);
      invalidate();
    } catch (err) {
      showAlert("Couldn't rename", getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const addPerson = async (userId: string) => {
    if (working) {
      return;
    }
    setWorking(true);
    try {
      await webnestApi.addParticipants(conversationId, [userId]);
      search.setQ('');
      setAdding(false);
      invalidate();
    } catch (err) {
      showAlert("Couldn't add them", getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const removePerson = (userId: string, label: string) => {
    showAlert('Remove member', `Remove ${label} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await webnestApi.removeParticipant(conversationId, userId);
            invalidate();
          } catch (err) {
            showAlert("Couldn't remove", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  const leave = () => {
    if (!myId) {
      return;
    }
    showAlert('Leave conversation', 'You will stop receiving messages from this chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await webnestApi.removeParticipant(conversationId, myId);
            invalidate();
            navigation.navigate('ChatList');
          } catch (err) {
            showAlert("Couldn't leave", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <ChatErrorBoundary variant="screen" label="Group info" onRetry={refetch}>
      <Screen>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.goldPrimary} />
          </View>
        ) : isError && !conversation ? (
          <View style={styles.center}>
            <Text variant="body" tone="secondary" center>
              {getErrorMessage(error)}
            </Text>
            <Text variant="label" tone="gold" onPress={() => refetch()} style={styles.retry}>
              RETRY
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <ChatAvatar
                name={conversation?.title || 'Conversation'}
                group={isGroup}
                size={72}
              />
              <Text variant="sectionTitle" center style={styles.heroName}>
                {conversation?.title || 'Direct message'}
              </Text>
              <Text variant="caption" tone="tertiary">
                {participants.length} {participants.length === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {isGroup && isManager ? (
              <View style={styles.renameRow}>
                <View style={styles.renameField}>
                  <FormInput
                    label="Group name"
                    value={rename}
                    onChangeText={t => setRename(t.slice(0, 120))}
                  />
                </View>
                <Button
                  title="Save"
                  fullWidth={false}
                  loading={savingName}
                  disabled={!rename.trim() || rename.trim() === conversation?.title}
                  onPress={saveName}
                  style={styles.saveBtn}
                />
              </View>
            ) : null}

            <View style={styles.listHead}>
              <Text variant="label" tone="gold">
                Members
              </Text>
              {isGroup && isManager ? (
                <Pressable onPress={() => setAdding(a => !a)} hitSlop={8} style={styles.addToggle}>
                  <Icon name={adding ? 'x' : 'user-plus'} size={16} color={colors.goldPrimary} />
                  <Text variant="caption" tone="gold">
                    {adding ? 'Close' : 'Add'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {adding ? (
              <View style={styles.addBox}>
                <FormInput
                  label="Search people"
                  placeholder="Name or email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={search.q}
                  onChangeText={search.setQ}
                />
                {(() => {
                  const addable = search.results.filter(
                    u => !participants.some(p => p.user.id === u.id),
                  );
                  if (working) {
                    return (
                      <ActivityIndicator color={colors.goldPrimary} style={styles.addLoader} />
                    );
                  }
                  if (!search.enabled) {
                    return null;
                  }
                  if (addable.length) {
                    return (
                      <View style={styles.addResults}>
                        {addable.map(u => (
                          <PersonRow
                            key={u.id}
                            name={u.full_name}
                            email={u.email}
                            trailingIcon="plus"
                            onPress={() => addPerson(u.id)}
                          />
                        ))}
                      </View>
                    );
                  }
                  return (
                    <Text variant="caption" tone="tertiary" style={styles.addHint}>
                      {search.results.length
                        ? 'Everyone matching is already in this group.'
                        : 'No registered users match that.'}
                    </Text>
                  );
                })()}
              </View>
            ) : null}

            <View style={styles.members}>
              {participants.map(p => {
                const label = p.user.full_name || p.user.email || 'Member';
                const isMe = p.user.id === myId;
                return (
                  <PersonRow
                    key={p.user.id}
                    name={isMe ? `${label} (you)` : label}
                    email={p.user.email}
                    trailingIcon={
                      isGroup && isManager && !isMe ? 'user-minus' : undefined
                    }
                    onPress={
                      isGroup && isManager && !isMe
                        ? () => removePerson(p.user.id, label)
                        : undefined
                    }
                  />
                );
              })}
            </View>

            <View style={styles.leaveWrap}>
              <Button title="Leave conversation" variant="outline" icon="log-out" onPress={leave} />
            </View>
          </>
        )}
      </Screen>
    </ChatErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 200,
    justifyContent: 'center',
  },
  retry: {
    letterSpacing: 2,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  heroName: {
    marginTop: spacing.xs,
  },
  renameRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  renameField: {
    flex: 1,
  },
  saveBtn: {
    marginBottom: 2,
  },
  listHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 2,
  },
  addToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  addBox: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  addLoader: {
    marginVertical: spacing.md,
  },
  addResults: {
    marginTop: spacing.xs,
  },
  addHint: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  members: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  leaveWrap: {
    marginTop: spacing.xl,
  },
});

import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';

import { getErrorMessage } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import { showAlert } from '../../components/AppAlert';
import { ChatErrorBoundary } from '../../components/chat/ChatErrorBoundary';
import { PersonRow } from '../../components/chat/PersonRow';
import { RowSeparator } from '../../components/chat/RowSeparator';
import { FormInput } from '../../components/FormInput';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { usePeopleSearch } from '../../features/chat/usePeopleSearch';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import type { ChatStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'NewChat'>;

export function NewChatScreen() {
  const navigation = useNavigation<Nav>();
  const { q, setQ, term, enabled, results, isLoading, isError, error } = usePeopleSearch();
  const [busy, setBusy] = useState(false);

  const startDirect = async (userId: string, peerName: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const convo = await webnestApi.createDirect(userId);
      if (!convo?.id) {
        throw new Error('bad response');
      }
      navigation.replace('ChatRoom', { conversationId: convo.id, title: peerName });
    } catch (err) {
      showAlert("Couldn't start the chat", getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChatErrorBoundary variant="screen" label="New chat">
      <Screen scroll={false}>
        <View style={styles.top}>
          <Pressable
            onPress={() => navigation.navigate('NewGroup')}
            style={({ pressed }) => [styles.groupCta, pressed && styles.groupCtaPressed]}>
            <View style={styles.groupIcon}>
              <Icon name="users" size={18} color={colors.goldPrimary} />
            </View>
            <Text variant="bodyStrong" style={styles.groupLabel}>
              New group
            </Text>
            <Icon name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>

          <FormInput
            label="Add someone"
            placeholder="Search by name or email"
            autoCapitalize="none"
            autoCorrect={false}
            value={q}
            onChangeText={setQ}
          />
        </View>

        {busy ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.goldPrimary} />
          </View>
        ) : !enabled ? (
          <Text variant="caption" tone="tertiary" style={styles.hint}>
            Type at least 2 characters. Only people with a WebNest Studio account appear here.
          </Text>
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.goldPrimary} />
          </View>
        ) : isError ? (
          <Text variant="caption" tone="danger" style={styles.hint}>
            {getErrorMessage(error)}
          </Text>
        ) : results.length === 0 ? (
          <Text variant="caption" tone="tertiary" style={styles.hint}>
            No one matches “{term}”. They'll show up here once they've signed up in the app.
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <PersonRow
                name={item.full_name}
                email={item.email}
                trailingIcon="message-circle"
                onPress={() =>
                  // Pass the name only; email in search results is masked, and
                  // ChatRoom will derive the real name from participants anyway.
                  startDirect(item.id, item.full_name || 'Direct message')
                }
              />
            )}
            ItemSeparatorComponent={RowSeparator}
          />
        )}
      </Screen>
    </ChatErrorBoundary>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  groupCta: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  groupCtaPressed: {
    opacity: 0.85,
  },
  groupIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  groupLabel: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

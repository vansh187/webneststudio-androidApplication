import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getErrorMessage } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import { showAlert } from '../../components/AppAlert';
import { Button } from '../../components/Button';
import { ChatErrorBoundary } from '../../components/chat/ChatErrorBoundary';
import { PersonRow } from '../../components/chat/PersonRow';
import { RowSeparator } from '../../components/chat/RowSeparator';
import { Chip } from '../../components/Chip';
import { FormInput } from '../../components/FormInput';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { usePeopleSearch } from '../../features/chat/usePeopleSearch';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { UserSearchResult } from '../../types/api';
import type { ChatStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'NewGroup'>;

export function NewGroupScreen() {
  const navigation = useNavigation<Nav>();
  const { q, setQ, term, enabled, results, isLoading, isError, error } = usePeopleSearch();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [creating, setCreating] = useState(false);

  const selectedIds = useMemo(() => new Set(selected.map(u => u.id)), [selected]);

  const toggle = (user: UserSearchResult) => {
    setSelected(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user],
    );
  };

  const canCreate = name.trim().length >= 1 && selected.length >= 1 && !creating;

  const create = async () => {
    if (!canCreate) {
      return;
    }
    setCreating(true);
    try {
      const convo = await webnestApi.createGroup(
        name.trim().slice(0, 120),
        selected.map(u => u.id),
      );
      if (!convo?.id) {
        throw new Error('bad response');
      }
      navigation.replace('ChatRoom', { conversationId: convo.id, title: convo.title ?? name.trim() });
    } catch (err) {
      showAlert("Couldn't create the group", getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <ChatErrorBoundary variant="screen" label="New group">
      <Screen scroll={false}>
        <View style={styles.top}>
          <FormInput
            label="Group name"
            placeholder="e.g. V Stitch — Website Revamp"
            value={name}
            onChangeText={t => setName(t.slice(0, 120))}
          />

          {selected.length ? (
            <View style={styles.chips}>
              {selected.map(u => (
                <Chip
                  key={u.id}
                  label={(u.full_name || u.email || '').split(' ')[0] || 'User'}
                  selected
                  onPress={() => toggle(u)}
                />
              ))}
            </View>
          ) : null}

          <FormInput
            label="Add people"
            placeholder="Search by name or email"
            autoCapitalize="none"
            autoCorrect={false}
            value={q}
            onChangeText={setQ}
          />
        </View>

        {!enabled ? (
          <Text variant="caption" tone="tertiary" style={styles.hint}>
            Type at least 2 characters. Only registered WebNest Studio users can be added.
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
            No one matches “{term}”.
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <PersonRow
                name={item.full_name}
                email={item.email}
                selectable
                selected={selectedIds.has(item.id)}
                onPress={() => toggle(item)}
              />
            )}
            ItemSeparatorComponent={RowSeparator}
          />
        )}

        <View style={styles.footer}>
          <Button
            title={selected.length ? `Create group · ${selected.length}` : 'Create group'}
            icon="arrow-right"
            loading={creating}
            disabled={!canCreate}
            onPress={create}
          />
        </View>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  footer: {
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

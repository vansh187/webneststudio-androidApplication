import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import {
  ContactEmailEntry,
  ensureContactsPermission,
  listContactEmails,
} from '../api/contactsPicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { BottomSheet } from './chat/BottomSheet';
import { PersonRow } from './chat/PersonRow';
import { FormInput } from './FormInput';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (entry: ContactEmailEntry) => void;
};

/** Shared "pick a teammate's email from your phone contacts" sheet — used by
 * the chat "Add member" flow and the admin "Assign project" form. */
export function ContactPickerSheet({ visible, onClose, onPick }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<ContactEmailEntry[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuery('');

    (async () => {
      const granted = await ensureContactsPermission();
      if (cancelled) {
        return;
      }
      if (!granted) {
        setError('Contacts permission is needed — enable it in Settings.');
        setLoading(false);
        return;
      }
      try {
        const rows = await listContactEmails();
        if (!cancelled) {
          setContacts(rows);
        }
      } catch {
        if (!cancelled) {
          setError('Could not read your contacts.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return contacts;
    }
    return contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Pick from contacts">
      <FormInput
        label="Search"
        placeholder="Name or email"
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />
      <View style={styles.listWrap}>
        {loading ? (
          <ActivityIndicator color={colors.goldPrimary} style={styles.loader} />
        ) : error ? (
          <Text variant="caption" tone="danger" style={styles.hint}>
            {error}
          </Text>
        ) : filtered.length === 0 ? (
          <Text variant="caption" tone="tertiary" style={styles.hint}>
            {contacts.length === 0
              ? 'None of your contacts have an email address.'
              : 'No contact matches that.'}
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <PersonRow
                name={item.name}
                email={item.email}
                trailingIcon="chevron-right"
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
              />
            )}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    marginTop: spacing.sm,
    maxHeight: 360,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  hint: {
    marginVertical: spacing.lg,
    marginHorizontal: 2,
  },
});

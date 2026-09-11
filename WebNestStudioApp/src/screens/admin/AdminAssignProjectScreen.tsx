import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import type { ContactEmailEntry } from '../../api/contactsPicker';
import { getErrorMessage } from '../../api/client';
import { showAlert } from '../../components/AppAlert';
import { Button } from '../../components/Button';
import { ContactPickerSheet } from '../../components/ContactPickerSheet';
import { FormInput } from '../../components/FormInput';
import { PersonRow } from '../../components/chat/PersonRow';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Text } from '../../components/Text';
import { useCreateAdminProject } from '../../features/projects/adminProjectQueries';
import { usePeopleSearch } from '../../features/chat/usePeopleSearch';
import type { SdlcStageKey } from '../../types/api';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';

type Nav = ReturnType<typeof useNavigation<any>>;

const STAGES: Array<{ key: SdlcStageKey; label: string }> = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'design', label: 'Design' },
  { key: 'development', label: 'Development' },
  { key: 'testing', label: 'Testing' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'maintenance', label: 'Maintenance' },
];

export function AdminAssignProjectScreen() {
  const navigation = useNavigation<Nav>();
  const search = usePeopleSearch();
  // Search results only ever carry a masked email (privacy — see
  // usersRouter/search_users), so a tap just confirms a visual match; the
  // real address submitted is always whatever the admin actually typed.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [stage, setStage] = useState<SdlcStageKey>('requirements');
  const [createChat, setCreateChat] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(false);
  const create = useCreateAdminProject();

  const onPickContact = (entry: ContactEmailEntry) => {
    search.setQ(entry.email);
    setPickedId(null);
  };

  const onEmailChange = (text: string) => {
    search.setQ(text);
    setPickedId(null);
  };

  const submit = async () => {
    const email = search.q.trim();
    if (!email || !name.trim()) {
      showAlert('Missing details', 'Enter the client email and a project name.');
      return;
    }
    try {
      const project = await create.mutateAsync({
        client_email: email,
        name: name.trim(),
        summary: summary.trim() || undefined,
        current_stage: stage,
        create_conversation: createChat,
      });
      navigation.replace('AdminProjectDetail', { projectId: project.id });
    } catch (err) {
      showAlert("Couldn't create project", getErrorMessage(err));
    }
  };

  return (
    <Screen>
      <SectionHeader
        eyebrow="Admin"
        title="New project"
        description="Assign a project to a registered client by email."
      />

      <View style={styles.field}>
        <FormInput
          label="Client email"
          placeholder="client@company.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={search.q}
          onChangeText={onEmailChange}
        />
        <Pressable
          onPress={() => setContactsOpen(true)}
          hitSlop={8}
          style={styles.contactsLink}>
          <Icon name="book-open" size={13} color={colors.goldPrimary} />
          <Text variant="caption" tone="gold">
            Pick from contacts
          </Text>
        </Pressable>
        {search.isLoading ? null : search.enabled && search.results.length > 0 ? (
          <View style={styles.results}>
            {search.results.map(u => (
              <PersonRow
                key={u.id}
                name={u.full_name}
                email={u.email}
                trailingIcon={pickedId === u.id ? 'check' : undefined}
                onPress={() => setPickedId(u.id)}
              />
            ))}
          </View>
        ) : search.enabled ? (
          <Text variant="caption" tone="tertiary" style={styles.hint}>
            No registered user matches that.
          </Text>
        ) : null}
      </View>

      <FormInput label="Project name" value={name} onChangeText={setName} />

      <FormInput
        label="Summary (optional)"
        placeholder="Marketing site rebuild on Next.js + headless CMS."
        multiline
        numberOfLines={3}
        value={summary}
        onChangeText={setSummary}
      />

      <View style={styles.field}>
        <Text variant="label" tone="gold" style={styles.label}>
          Starting stage
        </Text>
        <View style={styles.stageRow}>
          {STAGES.map(s => {
            const selected = s.key === stage;
            return (
              <Pressable
                key={s.key}
                onPress={() => setStage(s.key)}
                style={[styles.stageChip, selected && styles.stageChipActive]}>
                <Text variant="caption" tone={selected ? 'onGold' : 'secondary'} style={styles.stageChipText}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" tone="tertiary">
          Earlier stages are marked done automatically; this one starts in progress.
        </Text>
      </View>

      <Pressable style={styles.toggleRow} onPress={() => setCreateChat(v => !v)}>
        <Text variant="label" tone="gold">
          Create team chat
        </Text>
        <View style={[styles.toggleTrack, createChat && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, createChat && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      <Button
        title="Create project"
        icon="check"
        loading={create.isPending}
        disabled={!search.q.trim() || !name.trim()}
        onPress={submit}
        style={styles.submit}
      />

      <ContactPickerSheet
        visible={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onPick={onPickContact}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  label: {
    marginLeft: 2,
  },
  contactsLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xxs,
    marginLeft: 2,
    marginTop: -2,
  },
  results: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  hint: {
    marginLeft: 2,
    marginTop: spacing.xs,
  },
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stageChip: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  stageChipActive: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  stageChipText: {
    fontWeight: '600',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  toggleTrack: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 26,
    justifyContent: 'center',
    padding: 3,
    width: 46,
  },
  toggleTrackOn: {
    backgroundColor: colors.goldFill,
  },
  toggleThumb: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.pill,
    height: 20,
    width: 20,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.textOnGold,
  },
  submit: {
    marginBottom: spacing.xl,
  },
});

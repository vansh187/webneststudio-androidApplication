import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from '../Text';
import { BottomSheet } from './BottomSheet';

export type SheetAction = {
  key: string;
  label: string;
  icon: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
  /** Optional node rendered above the actions (e.g. a quick-reaction row). */
  header?: React.ReactNode;
};

/** Generic vertical action menu (attachment source, message long-press). */
export function ActionRowSheet({ visible, onClose, title, actions, header }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {actions.map(action => (
        <Pressable
          key={action.key}
          onPress={() => {
            onClose();
            // defer so the modal is gone before any follow-up UI opens
            setTimeout(() => {
              try {
                action.onPress();
              } catch {
                // swallowed — actions must not throw into the tree
              }
            }, 10);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <Icon
            name={action.icon}
            size={18}
            color={action.tone === 'danger' ? colors.danger : colors.goldPrimary}
          />
          <Text
            variant="body"
            tone={action.tone === 'danger' ? 'danger' : 'primary'}
            style={styles.label}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  label: {
    flex: 1,
  },
});

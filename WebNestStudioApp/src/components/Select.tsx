import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  options: readonly string[];
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Dark-themed dropdown. Tapping the field raises a bottom sheet of options —
 * RN has no native <select>, and a picker wheel reads cheap against this palette.
 */
export function Select({
  label,
  value,
  placeholder = 'Select an option',
  options,
  onChange,
  error,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.field, open && styles.fieldOpen, !!error && styles.fieldError]}>
        <Text
          variant="body"
          tone={value ? 'primary' : 'tertiary'}
          style={styles.value}
          numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textTertiary} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text variant="label" tone="gold" style={styles.sheetTitle}>
              {label}
            </Text>
            {options.map(opt => {
              const selected = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={[styles.option, selected && styles.optionSelected]}>
                  <Text variant="body" tone={selected ? 'gold' : 'primary'} style={styles.optionText}>
                    {opt}
                  </Text>
                  {selected ? <Icon name="check" size={16} color={colors.goldPrimary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: 2,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  fieldOpen: {
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  value: {
    flex: 1,
  },
  modalRoot: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.sm,
    width: 40,
  },
  sheetTitle: {
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  option: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
  },
  optionText: {
    flex: 1,
  },
});

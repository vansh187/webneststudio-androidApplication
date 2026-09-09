import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { font } from '../theme/typography';
import { Text } from './Text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormInput({ label, error, hint, style, secureTextEntry, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.goldPrimary}
          secureTextEntry={isPassword && !reveal}
          onFocus={e => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            isPassword && styles.inputWithAction,
            props.multiline && styles.inputMultiline,
            style,
          ]}
          {...props}
        />
        {isPassword ? (
          <Pressable onPress={() => setReveal(v => !v)} hitSlop={10} style={styles.action}>
            <Icon name={reveal ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
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
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: {
    borderColor: colors.borderAccent,
    backgroundColor: colors.surfaceGold,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.sans,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  inputWithAction: {
    paddingRight: 4,
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

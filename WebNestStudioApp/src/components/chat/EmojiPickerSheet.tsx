import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { Text } from '../Text';
import { BottomSheet } from './BottomSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** Compact = just the quick-reaction row (used from the message action sheet). */
  compact?: boolean;
};

export const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉', '👏', '🙏', '✅', '😮'];

const SECTIONS: { label: string; emoji: string[] }[] = [
  {
    label: 'Reactions',
    emoji: ['👍', '👎', '❤️', '🔥', '🎉', '👏', '🙏', '✅', '❌', '💯', '😮', '👀'],
  },
  {
    label: 'Smileys',
    emoji: ['😀', '😄', '😁', '😅', '😂', '🙂', '😉', '😊', '😍', '😘', '😎', '🤔', '😐', '😴', '😢', '😭', '😤', '😳', '🥳', '🤩'],
  },
  {
    label: 'Gestures',
    emoji: ['👋', '🤝', '✌️', '🤞', '👌', '🤙', '💪', '🙌', '👇', '👆', '👉', '👈'],
  },
  {
    label: 'Work',
    emoji: ['💼', '📁', '📄', '📎', '📌', '🗓️', '⏰', '💡', '🚀', '⚙️', '📈', '📊', '✏️', '🔧', '💻', '🖥️'],
  },
  {
    label: 'Hearts & stars',
    emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '⭐', '🌟', '✨', '💫'],
  },
];

export function EmojiPickerSheet({ visible, onClose, onPick, compact = false }: Props) {
  const sections = useMemo(() => SECTIONS, []);

  const choose = (e: string) => {
    onPick(e);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={compact ? undefined : 'Emoji'}>
      {compact ? (
        <View style={styles.quickRow}>
          {QUICK_REACTIONS.map(e => (
            <Pressable key={e} onPress={() => choose(e)} style={styles.quickCell}>
              <Text style={styles.quickGlyph}>{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {sections.map(section => (
            <View key={section.label} style={styles.section}>
              <Text variant="caption" tone="tertiary" style={styles.sectionLabel}>
                {section.label}
              </Text>
              <View style={styles.grid}>
                {section.emoji.map((e, i) => (
                  <Pressable key={`${e}-${i}`} onPress={() => choose(e)} style={styles.cell}>
                    <Text style={styles.glyph}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 360,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    width: `${100 / 8}%`,
  },
  glyph: {
    fontSize: 26,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  quickCell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 40,
  },
  quickGlyph: {
    fontSize: 24,
  },
});

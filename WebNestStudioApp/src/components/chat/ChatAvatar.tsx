import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors, gradients } from '../../theme/colors';
import { initials } from '../../utils/format';
import { Gradient } from '../Gradient';
import { Text } from '../Text';

type Props = {
  name?: string | null;
  group?: boolean;
  size?: number;
};

/** Gold-rimmed initials disc (person) or group glyph. */
export function ChatAvatar({ name, group = false, size = 44 }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const fontSize = Math.round(size * 0.34);

  return (
    <View style={[styles.wrap, dim]}>
      <Gradient
        colors={gradients.goldSoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.wash]}
      />
      {group ? (
        <Icon name="users" size={Math.round(size * 0.42)} color={colors.goldPrimary} />
      ) : (
        <Text variant="rowTitle" tone="gold" style={[styles.text, { fontSize }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wash: {
    opacity: 0.14,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

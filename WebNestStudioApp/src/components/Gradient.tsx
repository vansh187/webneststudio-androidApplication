import React from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Thin wrapper over react-native-linear-gradient.
 *
 * If the native module has not been linked yet (fresh checkout that hasn't been
 * rebuilt), we fall back to a flat View painted with the first colour so the app
 * still renders instead of red-boxing. Rebuild the Android app once and the real
 * gradient shows up.
 */

type Props = ViewProps & {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
};

let LinearGradient: React.ComponentType<any> | null = null;
try {
  LinearGradient = require('react-native-linear-gradient').default;
} catch {
  LinearGradient = null;
}

export function Gradient({ colors, start, end, locations, style, children, ...rest }: Props) {
  if (!LinearGradient) {
    return (
      <View style={[{ backgroundColor: colors[0] }, style]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={colors as string[]}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 1 }}
      locations={locations as number[] | undefined}
      style={style}
      {...rest}>
      {children}
    </LinearGradient>
  );
}

export const gradientReady = Boolean(LinearGradient);

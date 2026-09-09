import React, { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radii, shadow, spacing } from '../theme/spacing';
import { Gradient } from './Gradient';
import { Text } from './Text';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

let showFn: ((cfg: AlertConfig) => void) | null = null;

/**
 * Drop-in, theme-aware replacement for React Native's `Alert.alert`. Same
 * signature; renders the branded dialog from <AlertHost /> (mounted once at the
 * app root) instead of the stock white OS dialog.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  showFn?.({ title, message, buttons });
}

export function AlertHost(): React.JSX.Element {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const visible = config !== null;

  useEffect(() => {
    showFn = cfg => setConfig(cfg);
    return () => {
      showFn = null;
    };
  }, []);

  const buttons: AlertButton[] =
    config?.buttons && config.buttons.length > 0
      ? config.buttons
      : [{ text: 'OK', style: 'default' }];

  const close = (btn?: AlertButton) => {
    setConfig(null);
    btn?.onPress?.();
  };

  const cancelButton = buttons.find(b => b.style === 'cancel');

  useEffect(() => {
    if (!config) {
      return;
    }
    const onBack = () => {
      const cancel = (config.buttons ?? []).find(b => b.style === 'cancel');
      setConfig(null);
      cancel?.onPress?.();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [config]);

  const stacked = buttons.length > 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => close(cancelButton)}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (cancelButton || buttons.length === 1) {
              close(cancelButton);
            }
          }}
        />
        <View style={styles.card}>
          <Gradient
            colors={['rgba(230,172,62,0.12)', 'rgba(230,172,62,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.halo}
          />
          <View style={styles.rule} />
          <Text variant="rowTitle" style={styles.title}>
            {config?.title}
          </Text>
          {config?.message ? (
            <Text variant="body" tone="secondary" style={styles.message}>
              {config.message}
            </Text>
          ) : null}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {buttons.map((b, i) => {
              const tone =
                b.style === 'destructive'
                  ? 'danger'
                  : b.style === 'cancel'
                  ? 'tertiary'
                  : 'gold';
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => close(b)}
                  style={({ pressed }) => [
                    styles.action,
                    stacked && styles.actionStacked,
                    pressed && styles.actionPressed,
                  ]}>
                  <Text variant="button" tone={tone} style={styles.actionText}>
                    {b.text.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    maxWidth: 400,
    overflow: 'hidden',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
    ...shadow.card,
  },
  halo: {
    height: 72,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  rule: {
    backgroundColor: colors.goldPrimary,
    borderRadius: radii.pill,
    height: 3,
    marginBottom: spacing.md,
    width: 34,
  },
  title: {
    marginBottom: spacing.xs,
  },
  message: {
    marginBottom: spacing.xs,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  actionsStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 0,
    marginTop: spacing.md,
  },
  action: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionStacked: {
    alignItems: 'center',
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: spacing.md,
  },
  actionPressed: {
    opacity: 0.55,
  },
  actionText: {
    letterSpacing: 1,
  },
});

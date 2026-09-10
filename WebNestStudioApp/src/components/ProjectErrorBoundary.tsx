import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { Text } from './Text';

type Props = {
  children: ReactNode;
  /** 'screen' = full-bleed fallback; 'inline' = compact card for a section/row. */
  variant?: 'screen' | 'inline';
  label?: string;
  onRetry?: () => void;
};

type State = { hasError: boolean };

/**
 * Belt-and-braces boundary for the Project Progress feature. `ProjectDetailScreen`
 * is wrapped in a `screen` boundary; the Profile card's project block is wrapped
 * `inline` — so a single malformed project payload can never blank the Profile
 * tab or the detail screen. It also never surfaces raw error text (no leakage);
 * the underlying reason is logged to the dev console only.
 */
export class ProjectErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[projects] ${this.props.label ?? 'boundary'} caught`, error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'inline') {
      return (
        <Pressable onPress={this.reset} style={styles.inline}>
          <Icon name="refresh-cw" size={13} color={colors.textTertiary} />
          <Text variant="caption" tone="tertiary">
            Couldn't show this — tap to retry
          </Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.screen}>
        <View style={styles.rule} />
        <Text variant="label" tone="gold">
          Something slipped
        </Text>
        <Text variant="sectionTitle" style={styles.heading}>
          {this.props.label ? `${this.props.label} hit a snag.` : 'This screen hit a snag.'}
        </Text>
        <Text variant="body" tone="secondary">
          Nothing was lost. Retry and it should come right back.
        </Text>
        <Pressable onPress={this.reset} style={styles.retry}>
          <Text variant="button" tone="onGold" style={styles.retryText}>
            RETRY
          </Text>
          <Icon name="rotate-cw" size={15} color={colors.textOnGold} />
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'flex-start',
    backgroundColor: colors.bgBase,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  rule: {
    backgroundColor: colors.goldPrimary,
    borderRadius: radii.pill,
    height: 3,
    marginBottom: spacing.xs,
    width: 34,
  },
  heading: {
    marginBottom: spacing.xxs,
  },
  retry: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.goldFill,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 52,
  },
  retryText: {
    fontSize: 13,
    letterSpacing: 1.4,
  },
  inline: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

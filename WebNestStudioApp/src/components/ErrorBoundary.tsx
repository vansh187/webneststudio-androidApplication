import React, { Component, ErrorInfo, PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Button } from './Button';
import { Text } from './Text';

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled app error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text variant="label">something went wrong</Text>
          <Text variant="sectionTitle">The app hit an unexpected issue.</Text>
          <Text>Please retry this screen. If it repeats, the error is logged in development for diagnosis.</Text>
          <Button title="Try again" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.bgBase,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});

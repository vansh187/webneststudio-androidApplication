import React, {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { BrandBackground } from './BrandBackground';

type Props = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  header?: ReactNode;
  edges?: readonly Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

// Gap kept between a focused input's bottom edge and the top of the keyboard.
const KEYBOARD_GAP = 28;

export function Screen({
  children,
  scroll = true,
  style,
  header,
  edges = ['top', 'left', 'right'],
  refreshing,
  onRefresh,
}: Props) {
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const offsetY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Android's `adjustResize` shrinks the window when the keyboard opens, but RN's
  // ScrollView won't pull a focused field into the space that's left. Two parts:
  //  1) pad the scroll content by the keyboard height so there's room to scroll,
  //  2) on show, measure the focused input and scroll it clear of the keyboard.
  useEffect(() => {
    if (!scroll) {
      return;
    }

    const onShow = (event: KeyboardEvent) => {
      const kbHeight = event.endCoordinates.height;
      setKeyboardHeight(kbHeight);

      const scrollNode = scrollRef.current;
      const focused = TextInput.State.currentlyFocusedInput?.();
      if (!scrollNode || !focused || typeof focused.measureInWindow !== 'function') {
        return;
      }
      // Let the resize + new padding settle before measuring.
      setTimeout(() => {
        focused.measureInWindow((_x: number, y: number, _w: number, height: number) => {
          if (y == null) {
            return;
          }
          const keyboardTop = event.endCoordinates.screenY;
          const targetBottom = Math.min(y + height, y + 140);
          const overlap = targetBottom - (keyboardTop - KEYBOARD_GAP);
          if (overlap > 0) {
            scrollNode.scrollTo({ y: offsetY.current + overlap, animated: true });
          }
        });
      }, 60);
    };

    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scroll]);

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.content,
        style,
        keyboardHeight > 0 && Platform.OS === 'android'
          ? { paddingBottom: spacing.xxxl + keyboardHeight }
          : null,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.goldPrimary}
            colors={[colors.goldPrimary]}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  return (
    <BrandBackground>
      <SafeAreaView style={styles.flex} edges={edges}>
        {header}
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView style={styles.flex} behavior="padding">
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
  },
});

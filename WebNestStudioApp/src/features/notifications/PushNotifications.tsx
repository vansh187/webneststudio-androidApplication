import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';

import { Text } from '../../components/Text';
import { navigationRef, openBlogPost, openChatRoom } from '../../navigation/navigationRef';
import { colors } from '../../theme/colors';
import { radii, shadow, spacing } from '../../theme/spacing';
import { chatKeys } from '../chat/chatQueries';
import { isPushAvailable, parsePushData, PushPayload, registerForPush, registerToken } from './push';

const BANNER_MS = 4500;
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 8000;

type Banner = { title: string; body: string; payload: PushPayload };

function openPayload(payload: PushPayload) {
  if (payload.type === 'chat') {
    openChatRoom(payload.conversationId, payload.title);
  } else {
    openBlogPost(payload.slug, payload.title);
  }
}

/** A tap can arrive before the signed-in navigator has mounted (cold start). */
function openWhenReady(payload: PushPayload) {
  const started = Date.now();
  const attempt = () => {
    if (navigationRef.isReady()) {
      openPayload(payload);
    } else if (Date.now() - started < READY_TIMEOUT_MS) {
      setTimeout(attempt, READY_POLL_MS);
    }
  };
  attempt();
}

function isViewingConversation(conversationId: string) {
  if (!navigationRef.isReady()) {
    return false;
  }
  const route = navigationRef.getCurrentRoute();
  const params = route?.params as { conversationId?: string } | undefined;
  return route?.name === 'ChatRoom' && params?.conversationId === conversationId;
}

/**
 * Mounted only while signed in. Registers this device for pushes, opens the
 * right screen when a notification is tapped, and — since Android doesn't
 * show notifications for a foregrounded app — shows an in-app banner instead.
 */
export function PushNotificationsBridge() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!isPushAvailable()) {
      return;
    }
    const messaging = getMessaging();

    registerForPush().catch(() => undefined);
    const unsubscribeToken = onTokenRefresh(messaging, token => {
      registerToken(token).catch(() => undefined);
    });

    // App was killed and the user tapped a notification to start it.
    getInitialNotification(messaging)
      .then(message => {
        const payload = parsePushData(message);
        if (payload) {
          openWhenReady(payload);
        }
      })
      .catch(() => undefined);

    // App was in the background and the user tapped a notification.
    const unsubscribeOpened = onNotificationOpenedApp(messaging, message => {
      const payload = parsePushData(message);
      if (payload) {
        openWhenReady(payload);
      }
    });

    const unsubscribeForeground = onMessage(messaging, message => {
      const payload = parsePushData(message);
      if (!payload) {
        return;
      }
      if (payload.type === 'chat') {
        // Refresh the list/badge now instead of waiting for the next poll.
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        if (isViewingConversation(payload.conversationId)) {
          return; // the open room already shows it
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['blog'] });
      }
      setBanner({
        title: message.notification?.title ?? payload.title ?? 'WebNest Studio',
        body: message.notification?.body ?? '',
        payload,
      });
    });

    return () => {
      unsubscribeToken();
      unsubscribeOpened();
      unsubscribeForeground();
    };
  }, [queryClient]);

  return banner ? (
    <InAppBanner
      key={`${banner.title}:${banner.body}`}
      banner={banner}
      onDismiss={() => setBanner(null)}
    />
  ) : null;
}

function InAppBanner({ banner, onDismiss }: { banner: Banner; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-160)).current;

  const hide = useCallback(() => {
    Animated.timing(slide, { toValue: -160, duration: 180, useNativeDriver: true }).start(onDismiss);
  }, [onDismiss, slide]);

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const timer = setTimeout(hide, BANNER_MS);
    return () => clearTimeout(timer);
  }, [hide, slide]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingTop: insets.top + spacing.sm, transform: [{ translateY: slide }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        onPress={() => {
          openPayload(banner.payload);
          hide();
        }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.icon}>
          <Icon
            name={banner.payload.type === 'chat' ? 'message-circle' : 'book-open'}
            size={18}
            color={colors.goldPrimary}
          />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {banner.title}
          </Text>
          {banner.body ? (
            <Text variant="caption" tone="secondary" numberOfLines={2}>
              {banner.body}
            </Text>
          ) : null}
        </View>
        <Pressable hitSlop={10} onPress={hide} accessibilityLabel="Dismiss">
          <Icon name="x" size={16} color={colors.textTertiary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderAccent,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    ...shadow.goldStrong,
  },
  cardPressed: {
    opacity: 0.85,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

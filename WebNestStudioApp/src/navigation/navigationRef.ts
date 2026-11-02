import { createNavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from './types';

/**
 * Lets code outside a screen (push-notification taps) navigate. Only valid
 * while the signed-in AppStack is mounted — check isReady() first.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Opens a chat room from anywhere, keeping the chat list underneath it for Back. */
export function openChatRoom(conversationId: string, title?: string) {
  navigationRef.navigate('MainTabs', {
    screen: 'Chat',
    params: { screen: 'ChatRoom', initial: false, params: { conversationId, title } },
  });
}

export function openBlogPost(slug: string, title?: string) {
  navigationRef.navigate('BlogDetail', { slug, title });
}

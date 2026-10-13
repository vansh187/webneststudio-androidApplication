/**
 * @format
 */

import { getApps } from '@react-native-firebase/app';
import { subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';

import { webnestApi } from '../src/api/webnestApi';
import {
  BLOG_TOPIC,
  parsePushData,
  registerForPush,
  unregisterFromPush,
} from '../src/features/notifications/push';

jest.mock('../src/api/webnestApi', () => ({
  webnestApi: {
    registerDevice: jest.fn(async () => undefined),
    unregisterDevice: jest.fn(async () => undefined),
  },
}));

const api = webnestApi as jest.Mocked<typeof webnestApi>;
const mockedGetApps = getApps as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('parsePushData', () => {
  it('reads chat and blog payloads from the backend data block', () => {
    expect(
      parsePushData({ data: { type: 'chat', conversation_id: 'c1', title: 'Launch team' } } as any),
    ).toEqual({ type: 'chat', conversationId: 'c1', title: 'Launch team' });
    expect(parsePushData({ data: { type: 'blog', slug: 'online-booking' } } as any)).toEqual({
      type: 'blog',
      slug: 'online-booking',
      title: undefined,
    });
  });

  it('ignores anything it cannot route', () => {
    expect(parsePushData(null)).toBeNull();
    expect(parsePushData({ data: { type: 'chat' } } as any)).toBeNull();
    expect(parsePushData({ data: { type: 'promo', slug: 'x' } } as any)).toBeNull();
  });
});

describe('device registration', () => {
  it('is a no-op in a build without Firebase config', async () => {
    mockedGetApps.mockReturnValue([]);
    expect(await registerForPush()).toBeNull();
    await unregisterFromPush();
    expect(api.registerDevice).not.toHaveBeenCalled();
    expect(api.unregisterDevice).not.toHaveBeenCalled();
  });

  it('registers the token and joins the blog topic, and undoes both on logout', async () => {
    mockedGetApps.mockReturnValue([{ name: '[DEFAULT]' }]);

    expect(await registerForPush()).toBe('test-fcm-token');
    expect(api.registerDevice).toHaveBeenCalledWith('test-fcm-token');
    expect(subscribeToTopic).toHaveBeenCalledWith(expect.anything(), BLOG_TOPIC);

    await unregisterFromPush();
    expect(api.unregisterDevice).toHaveBeenCalledWith('test-fcm-token');
    expect(unsubscribeFromTopic).toHaveBeenCalledWith(expect.anything(), BLOG_TOPIC);
  });
});

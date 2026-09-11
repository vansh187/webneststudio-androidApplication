/* eslint-env jest */

jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://webneststudiobackend-n00h.onrender.com',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-contacts', () => ({
  checkPermission: jest.fn(async () => 'denied'),
  requestPermission: jest.fn(async () => 'denied'),
  getAllWithoutPhotos: jest.fn(async () => []),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true, assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true, assets: [] })),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(async () => ({})),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///tmp/visiting-card.png'),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style }, children);
  },
}));

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));

jest.mock('react-native-vector-icons/Feather', () => 'Icon');

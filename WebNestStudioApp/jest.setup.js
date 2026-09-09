/* eslint-env jest */

jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://webneststudiobackend-n00h.onrender.com',
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

/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Pushes carry a `notification` block, so Android shows them itself while the
// app is backgrounded or killed; taps are handled in PushNotificationsBridge.
// Registering a handler (even a no-op) is still required, outside React.
if (getApps().length > 0) {
  setBackgroundMessageHandler(getMessaging(), async () => {});
}

AppRegistry.registerComponent(appName, () => App);

import { Linking } from 'react-native';

import { showAlert } from '../components/AppAlert';

/**
 * Open an external URL (tel:, mailto:, https:, wa.me…) without ever letting a
 * rejected promise surface as an unhandled exception in production. If nothing
 * on the device can handle the link, the user gets a calm alert instead.
 */
export async function openExternal(url?: string | null): Promise<void> {
  if (!url) {
    showAlert("Couldn't open link", 'This link is not available right now.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    showAlert("Couldn't open link", 'No app on your device can handle this link.');
  }
}

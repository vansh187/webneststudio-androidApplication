import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

/**
 * Fingerprint / face login. We keep the user's credentials in a biometric-gated
 * Keychain entry (Android Keystore / iOS Secure Enclave). Retrieving them
 * triggers the OS biometric prompt; the plaintext never leaves the secure store
 * except in-memory for the single login call.
 */

const BIOMETRIC_SERVICE = 'webneststudio.biometric';
const ENABLED_FLAG = 'webneststudio.biometricLogin';

export type BiometryType = 'fingerprint' | 'face' | 'iris' | 'biometric';

function normalise(type: Keychain.BIOMETRY_TYPE | null): BiometryType | null {
  switch (type) {
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      return 'fingerprint';
    case Keychain.BIOMETRY_TYPE.FACE:
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      return 'face';
    case Keychain.BIOMETRY_TYPE.IRIS:
      return 'iris';
    default:
      return null;
  }
}

/** What the device supports right now (null = no enrolled biometrics / no hardware). */
export async function getSupportedBiometry(): Promise<BiometryType | null> {
  try {
    const type = await Keychain.getSupportedBiometryType();
    return normalise(type);
  } catch {
    return null;
  }
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_FLAG)) === 'true';
  } catch {
    return false;
  }
}

/** Store credentials behind a biometric lock and flip the flag on. */
export async function enableBiometricLogin(email: string, password: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(email, password, {
      service: BIOMETRIC_SERVICE,
      // CURRENT_SET (not BIOMETRY_ANY): the stored secret is invalidated if the
      // device's enrolled fingerprints/face change, so a newly added biometric
      // can't be used to read the saved password.
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.setItem(ENABLED_FLAG, 'true');
    return true;
  } catch {
    return false;
  }
}

export async function disableBiometricLogin(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch {
    // ignore — nothing stored
  }
  try {
    await AsyncStorage.removeItem(ENABLED_FLAG);
  } catch {
    // ignore
  }
}

export type BiometricCredentials = { email: string; password: string };

/**
 * Prompt for a fingerprint and return the stored credentials. Returns null when
 * the user cancels, the prompt fails, or nothing is stored.
 */
export async function getBiometricCredentials(
  promptTitle = 'Log in to WebNest Studio',
): Promise<BiometricCredentials | null> {
  try {
    const result = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      authenticationPrompt: { title: promptTitle },
    });
    if (!result || !result.username || !result.password) {
      return null;
    }
    return { email: result.username, password: result.password };
  } catch {
    // user cancelled / too many attempts / lockout
    return null;
  }
}

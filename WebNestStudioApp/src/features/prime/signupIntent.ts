import AsyncStorage from '@react-native-async-storage/async-storage';

let nextLoginWantsPrime = false;

/** For a login, where a fingerprint sign-in means the email isn't known yet. */
export function setNextLoginWantsPrime(wanted: boolean) {
  nextLoginWantsPrime = wanted;
}

/**
 * Payment needs a verified, signed-in account, so choosing Prime at signup only
 * records the wish. It's kept on disk so it survives an app restart between
 * signup and the emailed code, and it never grants anything.
 */
const keyFor = (email: string) => `webnest_prime_signup_intent:${email.trim().toLowerCase()}`;

export async function rememberPrimeIntent(email: string) {
  try {
    await AsyncStorage.setItem(keyFor(email), '1');
  } catch {
    // Non-fatal: they can still join from Home or Profile.
  }
}

export async function forgetPrimeIntent(email: string) {
  try {
    await AsyncStorage.removeItem(keyFor(email));
  } catch {
    // Non-fatal.
  }
}

/** Reads the wish once: it opens the plan screen one time, not on every launch. */
export async function takePrimeIntent(email: string) {
  const fromLogin = nextLoginWantsPrime;
  nextLoginWantsPrime = false;
  try {
    const key = keyFor(email);
    const found = (await AsyncStorage.getItem(key)) !== null;
    if (found) {
      await AsyncStorage.removeItem(key);
    }
    return found || fromLogin;
  } catch {
    return fromLogin;
  }
}

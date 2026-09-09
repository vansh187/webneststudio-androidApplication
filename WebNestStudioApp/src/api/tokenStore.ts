import * as Keychain from 'react-native-keychain';

const SERVICE = 'webneststudio.session';

type Session = {
  accessToken: string;
  refreshToken: string;
};

let memorySession: Session | null = null;

export async function getSession(): Promise<Session | null> {
  if (memorySession) {
    return memorySession;
  }

  const value = await Keychain.getGenericPassword({ service: SERVICE });
  if (!value) {
    return null;
  }

  memorySession = JSON.parse(value.password) as Session;
  return memorySession;
}

export async function setSession(session: Session) {
  memorySession = session;
  await Keychain.setGenericPassword('session', JSON.stringify(session), {
    service: SERVICE,
  });
}

export async function clearSession() {
  memorySession = null;
  await Keychain.resetGenericPassword({ service: SERVICE });
}

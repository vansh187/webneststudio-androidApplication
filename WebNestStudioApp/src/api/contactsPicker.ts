import Contacts from 'react-native-contacts';

export type ContactEmailEntry = {
  key: string;
  name: string;
  email: string;
};

export async function ensureContactsPermission(): Promise<boolean> {
  const status = await Contacts.checkPermission();
  if (status === 'authorized' || status === 'limited') {
    return true;
  }
  const requested = await Contacts.requestPermission();
  return requested === 'authorized' || requested === 'limited';
}

/** Every contact's email addresses, flattened one row per address, sorted by name. */
export async function listContactEmails(): Promise<ContactEmailEntry[]> {
  const contacts = await Contacts.getAllWithoutPhotos();
  const rows: ContactEmailEntry[] = [];
  for (const contact of contacts) {
    const name = contact.displayName || [contact.givenName, contact.familyName].filter(Boolean).join(' ') || 'Unknown';
    for (const entry of contact.emailAddresses || []) {
      const email = (entry?.email || '').trim();
      if (!email) {
        continue;
      }
      rows.push({ key: `${contact.recordID}-${email}`, name, email });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

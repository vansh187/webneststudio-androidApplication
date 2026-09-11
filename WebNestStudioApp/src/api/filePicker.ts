import { PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';

import type { AttachmentKind } from '../types/api';

/**
 * AndroidManifest.xml declares CAMERA (react-native-image-picker needs it
 * present to offer camera capture at all) — but declaring it makes the app
 * responsible for the Android 6+ runtime request too. Skipping this makes
 * launchCamera silently refuse with "Some files were skipped ... obtain the
 * same [permission]" instead of opening the camera. iOS handles this itself
 * via Info.plist, so this is a no-op there.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (already) {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera access',
    message: 'WebNest Studio needs camera access to take a photo.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
  width?: number;
  height?: number;
};

export type PickResult = {
  files: PickedFile[];
  rejected: string[]; // human messages for files that were skipped
  cancelled: boolean;
};

export function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime === 'application/pdf') {
    return 'pdf';
  }
  return 'file';
}

function screen(
  raw: Array<{ uri?: string | null; name?: string | null; type?: string | null; size?: number | null; width?: number | null; height?: number | null }>,
): PickResult {
  const files: PickedFile[] = [];
  const rejected: string[] = [];

  for (const item of raw) {
    if (!item?.uri) {
      continue;
    }
    const type = (item.type || '').toLowerCase() || 'application/octet-stream';
    const rawSize = typeof item.size === 'number' && item.size > 0 ? item.size : 0;
    const name = item.name || `attachment-${Date.now()}`;
    const kind = kindFromMime(type);

    if (!ALLOWED_MIME.has(type)) {
      rejected.push(`"${name}" — that file type can't be shared`);
      continue;
    }
    if (rawSize > MAX_ATTACHMENT_BYTES) {
      rejected.push(`"${name}" — larger than 25 MB`);
      continue;
    }
    // Documents reliably report a size; a missing one means we can't enforce the
    // 25 MB cap before signing, so refuse rather than risk a huge upload.
    if (rawSize === 0 && kind !== 'image') {
      rejected.push(`"${name}" — couldn't read its size`);
      continue;
    }
    files.push({
      uri: item.uri,
      name,
      type,
      size: rawSize,
      kind,
      width: item.width ?? undefined,
      height: item.height ?? undefined,
    });
  }

  if (files.length > MAX_ATTACHMENTS) {
    rejected.push(`Only the first ${MAX_ATTACHMENTS} files were attached`);
  }

  return { files: files.slice(0, MAX_ATTACHMENTS), rejected, cancelled: false };
}

const EMPTY: PickResult = { files: [], rejected: [], cancelled: true };

function fromAssets(assets: Asset[] | undefined): PickResult {
  if (!assets || assets.length === 0) {
    return EMPTY;
  }
  return screen(
    assets.map(a => ({
      uri: a.uri,
      name: a.fileName,
      type: a.type,
      size: a.fileSize,
      width: a.width,
      height: a.height,
    })),
  );
}

// Modern phone cameras shoot 12MP+ (often 5-15MB per photo); chat attachments
// don't need that — downscaling + re-encoding to JPEG at this quality keeps
// them sharp on a phone screen while cutting upload time dramatically.
const IMAGE_COMPRESSION = {
  quality: 0.7 as const,
  maxWidth: 1600,
  maxHeight: 1600,
};

export async function pickFromLibrary(): Promise<PickResult> {
  try {
    const res = await launchImageLibrary({
      // Photos only — no video MIME type is on the backend allow-list.
      mediaType: 'photo',
      selectionLimit: MAX_ATTACHMENTS,
      includeBase64: false,
      ...IMAGE_COMPRESSION,
    });
    if (res.didCancel) {
      return EMPTY;
    }
    if (res.errorCode) {
      return { files: [], rejected: [res.errorMessage || 'Could not open the gallery'], cancelled: false };
    }
    return fromAssets(res.assets);
  } catch {
    return { files: [], rejected: ['Could not open the gallery'], cancelled: false };
  }
}

export async function pickFromCamera(): Promise<PickResult> {
  const granted = await ensureCameraPermission();
  if (!granted) {
    return {
      files: [],
      rejected: ['Camera permission is needed to take a photo — enable it in Settings.'],
      cancelled: false,
    };
  }
  try {
    const res = await launchCamera({
      mediaType: 'photo',
      saveToPhotos: false,
      includeBase64: false,
      ...IMAGE_COMPRESSION,
    });
    if (res.didCancel) {
      return EMPTY;
    }
    if (res.errorCode) {
      return { files: [], rejected: [res.errorMessage || 'Could not open the camera'], cancelled: false };
    }
    return fromAssets(res.assets);
  } catch {
    return { files: [], rejected: ['Could not open the camera'], cancelled: false };
  }
}

/**
 * Document picking needs the native `@react-native-documents/picker` module,
 * which requires an app rebuild. Soft-required so a JS-only reload never crashes
 * — until the rebuild lands, this returns a friendly "rebuild required" message.
 */
export async function pickDocuments(): Promise<PickResult> {
  let mod: any;
  try {
    mod = require('@react-native-documents/picker');
  } catch {
    mod = null;
  }
  if (!mod?.pick) {
    return {
      files: [],
      rejected: ['File picking needs an app rebuild — photos work now'],
      cancelled: false,
    };
  }

  try {
    const picked = await mod.pick({
      allowMultiSelection: true,
      type: [mod.types?.pdf, mod.types?.images, mod.types?.docx, mod.types?.doc, mod.types?.plainText, mod.types?.xlsx].filter(Boolean),
    });
    return screen(
      (Array.isArray(picked) ? picked : []).map((p: any) => ({
        uri: p?.uri,
        name: p?.name,
        type: p?.type,
        size: p?.size,
      })),
    );
  } catch (err: any) {
    const code = err?.code ?? '';
    if (typeof code === 'string' && /cancel/i.test(code)) {
      return EMPTY;
    }
    return { files: [], rejected: ['Could not open the file picker'], cancelled: false };
  }
}

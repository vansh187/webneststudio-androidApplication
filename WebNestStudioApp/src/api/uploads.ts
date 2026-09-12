import { Video as VideoCompressor, getVideoMetaData } from 'react-native-compressor';

import { webnestApi } from './webnestApi';
import type { OutgoingAttachment } from '../types/api';
import { MAX_ATTACHMENT_BYTES, type PickedFile } from './filePicker';

export type UploadOutcome = {
  attachments: OutgoingAttachment[];
  failed: string[]; // human messages for files that could not be uploaded
};

const CONCURRENCY = 3;

type OneResult =
  | { ok: true; index: number; attachment: OutgoingAttachment }
  | { ok: false; index: number; message: string };

/**
 * Videos come off the picker uncompressed — this re-encodes to a much
 * smaller file before it's ever signed/uploaded. Never throws: a
 * compression failure just falls back to the original file, which the
 * MAX_ATTACHMENT_BYTES check in uploadOne accepts or rejects on its own
 * merits, exactly like any other attachment.
 */
async function compressVideoIfNeeded(file: PickedFile): Promise<PickedFile> {
  if (file.kind !== 'video') {
    return file;
  }
  try {
    const compressedUri = await VideoCompressor.compress(file.uri, {
      compressionMethod: 'auto',
    });
    const meta = await getVideoMetaData(compressedUri);
    const compressedSize = typeof meta?.size === 'number' && meta.size > 0 ? meta.size : file.size;
    return {
      ...file,
      uri: compressedUri,
      size: compressedSize,
      width: typeof meta?.width === 'number' ? meta.width : file.width,
      height: typeof meta?.height === 'number' ? meta.height : file.height,
    };
  } catch {
    return file;
  }
}

async function uploadOne(pickedFile: PickedFile, index: number): Promise<OneResult> {
  const file = await compressVideoIfNeeded(pickedFile);
  if (file.size > MAX_ATTACHMENT_BYTES) {
    const limitMb = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
    return {
      ok: false,
      index,
      message: `"${file.name}" — still larger than ${limitMb} MB after compression`,
    };
  }
  try {
    const target = await webnestApi.signAttachmentUpload({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    if (!target?.upload_url || !target?.url_path) {
      return { ok: false, index, message: `"${file.name}" — upload could not be prepared` };
    }

    const res = await fetch(target.upload_url, {
      method: target.method || 'PUT',
      headers: { 'Content-Type': file.type, ...(target.headers || {}) },
      // RN's fetch accepts this file-shaped object as a body.
      body: { uri: file.uri, name: file.name, type: file.type } as unknown as FormData,
    });

    if (!res.ok) {
      return { ok: false, index, message: `"${file.name}" — upload failed (${res.status})` };
    }

    return {
      ok: true,
      index,
      attachment: {
        url_path: target.url_path,
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        kind: file.kind,
        width: file.width ?? null,
        height: file.height ?? null,
      },
    };
  } catch {
    return { ok: false, index, message: `"${file.name}" — upload failed` };
  }
}

/**
 * Sign + upload each file straight to Supabase, with a small concurrency pool so
 * a 10-file batch doesn't serialize ~20 mobile round-trips. Every step is guarded
 * — one bad file never rejects the batch — and the returned attachments keep the
 * original pick order.
 */
export async function uploadAttachments(
  files: PickedFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<UploadOutcome> {
  const total = files.length;
  const results: OneResult[] = new Array(total);
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < total) {
      const index = cursor++;
      const outcome = await uploadOne(files[index], index);
      results[index] = outcome;
      done += 1;
      onProgress?.(done, total);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()),
  );

  const attachments: OutgoingAttachment[] = [];
  const failed: string[] = [];
  for (const r of results) {
    if (r?.ok) {
      attachments.push(r.attachment);
    } else if (r) {
      failed.push(r.message);
    }
  }

  return { attachments, failed };
}

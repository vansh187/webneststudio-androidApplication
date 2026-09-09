import { webnestApi } from './webnestApi';
import type { OutgoingAttachment } from '../types/api';
import type { PickedFile } from './filePicker';

export type UploadOutcome = {
  attachments: OutgoingAttachment[];
  failed: string[]; // human messages for files that could not be uploaded
};

const CONCURRENCY = 3;

type OneResult =
  | { ok: true; index: number; attachment: OutgoingAttachment }
  | { ok: false; index: number; message: string };

async function uploadOne(file: PickedFile, index: number): Promise<OneResult> {
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

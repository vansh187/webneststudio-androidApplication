import type {
  AdminProjectRow,
  ProjectDetail,
  ProjectLifecycleStatus,
  ProjectStage,
  ProjectStageState,
  ProjectSummary,
  SdlcStageKey,
} from '../../types/api';

/**
 * Defensive normalisers for the /api/me/projects payloads.
 *
 * The render layer never trusts the wire shape: every field is coerced to a
 * known type/range here, unknown enum values fall back to a safe default, and a
 * project with no usable `id` is dropped. A malformed response can degrade the
 * card but can never throw inside a component.
 */

type Raw = Record<string, unknown>;

export const SDLC_STAGES: ReadonlyArray<{ key: SdlcStageKey; label: string }> = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'design', label: 'Design' },
  { key: 'development', label: 'Development' },
  { key: 'testing', label: 'Testing' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'maintenance', label: 'Maintenance' },
];

const STAGE_KEYS: SdlcStageKey[] = SDLC_STAGES.map(s => s.key);
const STAGE_LABEL: Record<SdlcStageKey, string> = SDLC_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<SdlcStageKey, string>,
);
const STAGE_STATES: ProjectStageState[] = ['pending', 'in_progress', 'done'];
const STATUSES: ProjectLifecycleStatus[] = ['active', 'on_hold', 'completed', 'archived'];

function asRaw(input: unknown): Raw {
  return input && typeof input === 'object' ? (input as Raw) : {};
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function asNullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asStageKey(value: unknown): SdlcStageKey {
  return typeof value === 'string' && (STAGE_KEYS as string[]).includes(value)
    ? (value as SdlcStageKey)
    : 'requirements';
}

function asStageState(value: unknown): ProjectStageState {
  return typeof value === 'string' && (STAGE_STATES as string[]).includes(value)
    ? (value as ProjectStageState)
    : 'pending';
}

function asStatus(value: unknown): ProjectLifecycleStatus {
  return typeof value === 'string' && (STATUSES as string[]).includes(value)
    ? (value as ProjectLifecycleStatus)
    : 'active';
}

function asPercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Six stages synthesised from a single `current_stage` — used for the compact
 * rail on the Profile card (the list endpoint returns no per-stage rows) and as
 * a fallback when the detail endpoint omits `stages`.
 */
export function deriveStages(current: SdlcStageKey): ProjectStage[] {
  const currentIdx = STAGE_KEYS.indexOf(current);
  const ts = nowIso();
  return SDLC_STAGES.map(
    (s, i): ProjectStage => ({
      key: s.key,
      label: s.label,
      order_index: i,
      state: i < currentIdx ? 'done' : i === currentIdx ? 'in_progress' : 'pending',
      note: null,
      started_at: null,
      completed_at: null,
      updated_at: ts,
    }),
  );
}

function normalizeStage(input: unknown, index: number): ProjectStage {
  const raw = asRaw(input);
  const key = asStageKey(raw.key);
  const order =
    typeof raw.order_index === 'number' ? raw.order_index : Number(raw.order_index);
  return {
    key,
    label: asText(raw.label, STAGE_LABEL[key]),
    order_index: Number.isFinite(order) ? order : index,
    state: asStageState(raw.state),
    note: asNullableText(raw.note),
    started_at: asNullableText(raw.started_at),
    completed_at: asNullableText(raw.completed_at),
    updated_at: asText(raw.updated_at, nowIso()),
  };
}

export function normalizeSummary(input: unknown): ProjectSummary | null {
  const raw = asRaw(input);
  const id = asText(raw.id);
  if (!id) {
    return null;
  }
  const current = asStageKey(raw.current_stage);
  return {
    id,
    name: asText(raw.name, 'WebNest project'),
    status: asStatus(raw.status),
    current_stage: current,
    current_stage_label: asText(raw.current_stage_label, STAGE_LABEL[current]),
    progress_percent: asPercent(raw.progress_percent),
    conversation_id: asNullableText(raw.conversation_id),
    updated_at: asText(raw.updated_at, nowIso()),
  };
}

export function normalizeDetail(input: unknown): ProjectDetail {
  const raw = asRaw(input);
  const summary = normalizeSummary(raw);
  const base: ProjectSummary = summary ?? {
    id: asText(raw.id),
    name: asText(raw.name, 'WebNest project'),
    status: 'active',
    current_stage: 'requirements',
    current_stage_label: STAGE_LABEL.requirements,
    progress_percent: 0,
    conversation_id: null,
    updated_at: nowIso(),
  };

  const fallbackStages = deriveStages(base.current_stage);
  let stages: ProjectStage[];
  const rawStages = raw.stages;

  if (Array.isArray(rawStages) && rawStages.length > 0) {
    const byKey = new Map<SdlcStageKey, ProjectStage>();
    rawStages.forEach((s, i) => {
      const norm = normalizeStage(s, i);
      byKey.set(norm.key, norm);
    });
    // Always emit the full ordered pipeline; fill any gaps from the fallback.
    stages = SDLC_STAGES.map((s, i) => byKey.get(s.key) ?? fallbackStages[i]);
  } else {
    stages = fallbackStages;
  }

  stages = stages.slice().sort((a, b) => a.order_index - b.order_index);

  return {
    ...base,
    summary: asNullableText(raw.summary),
    created_at: asText(raw.created_at, base.updated_at),
    stages,
  };
}

/** Admin-only rows — same wire shape as ProjectDetail plus the client's identity. */
export function normalizeAdminRow(input: unknown): AdminProjectRow {
  const raw = asRaw(input);
  return {
    ...normalizeDetail(raw),
    client_email: asText(raw.client_email),
    client_name: asNullableText(raw.client_name),
  };
}

# Client Project Progress — Frontend Integration & Endpoint Mapping

**Audience:** React Native / app team
**Repo:** `vansh187/webneststudio-androidApplication`, branch `android-develop` — `WebNestStudioApp/`
**Related:** `project-progress-backend-spec.md` (FastAPI side — the source of truth for payloads) · `chat-frontend-integration.md` (the chat this deep-links into)

Show the client, on the **Profile** screen, **which project WebNest is building and how
far along it is** — the project name plus the six-stage **SDLC pipeline** (Requirements →
Design → Development → Testing → Deployment → Maintenance), with the admin driving
progress. A client can have **several projects**, so the Profile card carries a
**dropdown** to switch between them and is **tappable** → a full `ProjectDetailScreen`.
Each project has a **team group chat** (the client is `owner`); "Open project team chat"
deep-links into the existing Chat stack, where the client adds teammates with the
**existing** GroupInfo flow.

All calls go through the existing axios instance `api` in `src/api/client.ts`, which
already injects the keychain bearer and handles 401-refresh / 503-retry — **nothing to
add for auth**. Add methods to the `webnestApi` object in `src/api/webnestApi.ts` in the
existing `api.get/post(...).then(r => r.data)` style.

Base URL (from `src/api/client.ts`):
`Config.API_BASE_URL || 'https://webneststudiobackend-n00h.onrender.com'`

> **Client-only surface.** The app calls **three** GET endpoints (§1). Everything that
> writes a project or advances a stage is an **admin** action (`/api/admin/projects*`,
> `project-progress-backend-spec.md` §6) done from the studio's admin tool — **do not
> build admin write UI in the app.** `ProjectStatus` / `projectStatus()` /
> `['me','project-status']` are **removed from the app** here (the endpoint stays alive
> server-side for old builds only).

---

## 1. Endpoint map — `webnestApi` method → HTTP → URL → consumer

| `webnestApi` method | Method | URL (relative to base) | Called from | react-query key / freshness |
|---|---|---|---|---|
| `listMyProjects()` | GET | `/api/me/projects` | `ProfileScreen` (progress card) | `['me','projects']`, `staleTime: 60_000`, `enabled: auth.isAuthenticated`; pull-to-refresh; optional `refetchInterval: 60_000` gated on `useIsAppActive()` + Profile `useIsFocused()` |
| `getMyProject(id)` | GET | `/api/me/projects/{id}` | `ProjectDetailScreen` | `['me','project', id]`, `enabled: Boolean(id)`; pull-to-refresh |

Response unwrap (mirror `listConversations()` which does `data.conversations ?? []`):

```ts
// src/api/webnestApi.ts  — add to the webnestApi object
listMyProjects: (): Promise<ProjectSummary[]> =>
  api.get('/api/me/projects').then(r => r.data.projects ?? []),

getMyProject: (id: string): Promise<ProjectDetail> =>
  api.get(`/api/me/projects/${id}`).then(r => r.data),
```

**Removed:** `projectStatus` (was `GET /api/me/project-status`). Delete the method, the
`['me','project-status']` query in `ProfileScreen`, and the `ProjectStatus` import.

No websocket. No mutations from the app — progress is admin-driven; the app re-reads.

Every payload shape (`ProjectSummary`, `ProjectDetail`, `ProjectStage`) is defined in
**`project-progress-backend-spec.md` §4** — treat that as canonical.

---

## 2. TypeScript types — add to `src/types/api.ts`

```ts
export type SdlcStageKey =
  | 'requirements' | 'design' | 'development' | 'testing' | 'deployment' | 'maintenance';
export type ProjectStageState = 'pending' | 'in_progress' | 'done';
export type ProjectLifecycleStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectStage = {
  key: SdlcStageKey;
  label: string;
  order_index: number;
  state: ProjectStageState;
  note: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectLifecycleStatus;
  current_stage: SdlcStageKey;
  current_stage_label: string;
  progress_percent: number;          // already resolved 0–100 by the backend (§3 of the backend spec)
  conversation_id: string | null;    // linked team group chat, if any
  updated_at: string;
};

export type ProjectDetail = ProjectSummary & {
  summary: string | null;
  created_at: string;
  stages: ProjectStage[];            // always 6, order_index 0→5
};
```

`ProjectStatus` (the old flat type) — **delete** it and its only consumer
(`ProfileScreen`). Nothing else references it.

---

## 3. Query layer — `src/features/projects/projectQueries.ts` (new)

Mirror `src/features/chat/chatQueries.ts` (keys factory + thin hooks):

```ts
import { useQuery } from '@tanstack/react-query';
import { webnestApi } from '../../api/webnestApi';
import { useAuth } from '../auth/AuthContext';

export const projectKeys = {
  all: ['me', 'projects'] as const,
  detail: (id: string) => ['me', 'project', id] as const,
};

export function useMyProjects() {
  const auth = useAuth();
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: webnestApi.listMyProjects,
    enabled: auth.isAuthenticated,
    staleTime: 60_000,
  });
}

export function useMyProject(id?: string) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: () => webnestApi.getMyProject(id as string),
    enabled: Boolean(id),
  });
}
```

Optional live-ish refresh (nice-to-have, not required for v1): pass
`refetchInterval: isActive && isFocused ? 60_000 : false` into `useMyProjects` using
`useIsAppActive()` (`src/features/chat/useIsAppActive.ts`, already exists) and
`useIsFocused()` from `@react-navigation/native`.

---

## 4. Selected-project persistence — `src/features/projects/selectedProject.ts` (new)

Same shape as `src/features/profile/avatarStore.ts` (AsyncStorage get/set), so the
dropdown choice survives an app restart:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'webneststudio.selectedProjectId';

export const getSelectedProjectId = () => AsyncStorage.getItem(KEY).catch(() => null);
export const setSelectedProjectId = (id: string) =>
  AsyncStorage.setItem(KEY, id).catch(() => {});
```

Resolution rule in `ProfileScreen`: after `listMyProjects()` resolves, pick
`stored id if still present in the list`, else `projects[0]` (the list is
`updated_at desc`, so index 0 is the most recently touched project).

---

## 5. `src/screens/ProfileScreen.tsx` — rework the "Project progress" card

Replace the `['me','project-status']` `useQuery` with `useMyProjects()`. Keep the
existing card chrome (`<Card variant="elevated">`, `styles.cardHead` gold "Project
progress" label + `activity` icon, `styles.track` / `styles.fill` progress bar).

```
const { data: projects = [], isLoading, isFetching, refetch } = useMyProjects();
const [selectedId, setSelectedId] = useState<string | null>(null);

useEffect(() => {                        // hydrate the persisted choice once projects arrive
  if (!projects.length) return;
  getSelectedProjectId().then(stored => {
    setSelectedId(projects.some(p => p.id === stored) ? stored : projects[0].id);
  });
}, [projects]);

const selected = projects.find(p => p.id === selectedId) ?? projects[0];
```

Card body:

| Condition | Render |
|---|---|
| `isLoading` | `<LoadingView label="Fetching projects" />` (unchanged pattern) |
| `!isLoading && projects.length === 0` | `<EmptyView message="No projects found." />` (unchanged — a client with no project is normal, never a red error) |
| `projects.length >= 1` | project block below |

Project block (for `selected`):
- **If `projects.length > 1`** — a `<Select>` (from `src/components/Select.tsx`) at the
  top of the card: `label="Project"`, `options={projects.map(p => p.name)}`,
  `value={selected.name}`, `onChange={name => { const p = projects.find(x => x.name === name)!; setSelectedId(p.id); setSelectedProjectId(p.id); }}`.
  (Names are admin-set and effectively unique; if a collision is a real worry, suffix
  with a short id slice in the option label and map back on change.)
- `<Text variant="rowTitle">{selected.name}</Text>`
- `<Text variant="body">{selected.current_stage_label}</Text>`
- progress bar — `styles.fill` width = `` `${selected.progress_percent}%` ``
- `<Text variant="caption" tone="tertiary">{selected.progress_percent}% complete · updated {formatDate(selected.updated_at)}</Text>`
- `<ProjectPipeline stages={/* see note */} variant="compact" />` — a 6-dot rail.
  `listMyProjects()` returns `ProjectSummary` (no `stages`); for the compact rail derive
  six pseudo-stages from `current_stage` + `SDLC_STAGE_KEYS` order (before → `done`,
  current → `in_progress`, after → `pending`), **or** simply render six dots filled up to
  `current_stage`'s index. Full per-stage detail (notes/dates) is on the detail screen.

Make the **whole card tappable**: wrap the body in `<Card variant="elevated" onPress={() =>
navigation.navigate('ProjectDetail', { projectId: selected.id })}>` and add a trailing
`<Icon name="chevron-right" size={18} color={colors.textTertiary} />` in `styles.cardHead`
so the affordance reads. `<Select>` opens its own modal, so a tap on the dropdown row
won't also fire the card's `onPress` (the `Pressable` inside `Select` swallows it) — if
that proves flaky on Android, split the dropdown into its own row *above* the tappable
card.

---

## 6. `src/screens/ProjectDetailScreen.tsx` (new)

```
route params: { projectId: string }
const { data, isFetching, refetch, isLoading } = useMyProject(projectId);
```

- `<Screen refreshing={isFetching} onRefresh={refetch}>`
- `<SectionHeader eyebrow="Project" title={data.name} description={data.summary ?? undefined} />`
- status pill: `<Badge label={data.status} tone={data.status === 'completed' ? 'success' : 'neutral'} />`
- progress: reuse the `styles.track` / `styles.fill` bar + `{data.progress_percent}% complete · updated {formatDate(data.updated_at)}`
- `<ProjectPipeline stages={data.stages} variant="full" />`
- **Team chat** — only when `data.conversation_id`:
  ```tsx
  <Button
    title="Open project team chat"
    icon="message-circle"
    onPress={() =>
      navigation.navigate('Chat', {
        screen: 'ChatRoom',
        params: { conversationId: data.conversation_id!, title: data.name },
      })
    }
  />
  <Text variant="caption" tone="tertiary">
    Add your team from the chat's Details screen.
  </Text>
  ```
  `navigate('Chat', { screen, params })` works because `MainTabParamList.Chat` is
  `NavigatorScreenParams<ChatStackParamList>` (see `chat-frontend-integration.md` §4).
- loading → `<LoadingView />`; a `404`/failure → `<ErrorView error={error} onRetry={refetch} />`
  (from `src/components/StateView.tsx`).

---

## 7. `src/components/ProjectPipeline.tsx` (new)

Presentational only. Theme tokens exclusively (`colors.goldPrimary`, `colors.goldFill`,
`colors.border`, `colors.textTertiary`, `spacing`, `radii`, `Text` variants) — matches
the gold-on-ink system.

```ts
type Props = { stages: ProjectStage[]; variant?: 'full' | 'compact' };
```

- **`full`** — vertical stepper, one row per stage:
  - node: `done` → filled `colors.goldFill` disc with a Feather `check` (14, `textOnGold`);
    `in_progress` → `colors.goldPrimary` ring (2px border, transparent centre) with a
    subtle `Animated` opacity pulse (RN core `Animated`, `useNativeDriver: true`);
    `pending` → 1px `colors.border` outline disc.
  - connector: 2px vertical `colors.border` line between nodes (`colors.goldFill` for the
    segment above a `done` node).
  - text: `<Text variant="rowTitle">{stage.label}</Text>`; if `stage.note`
    `<Text variant="caption" tone="tertiary">{stage.note}</Text>`; if `completed_at`
    `formatDate(stage.completed_at)` else if `started_at` `Started {formatDate(started_at)}`.
- **`compact`** — a single horizontal row of 6 small dots (`done`/`in_progress` = gold,
  `pending` = `colors.border`), no labels; for the Profile card.

Sort by `order_index` defensively before render.

---

## 8. Navigation — `src/navigation/`

`types.ts` — add to `RootStackParamList`:
```ts
export type RootStackParamList = {
  MainTabs: undefined;
  Services: undefined;
  Story: undefined;
  ProjectInquiry: undefined;
  VisitingCard: undefined;
  PortfolioDetail: { slug: string; title?: string | null };
  BlogDetail: { slug: string; title?: string | null };
  ProjectDetail: { projectId: string };          // NEW
};
```

`RootNavigator.tsx` — inside `AppStack` (the push `Stack.Navigator` that already holds
`Services` / `Story` / `PortfolioDetail`), register:
```tsx
<Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project' }} />
```
Reuses the existing push `stackScreenOptions` (flat ink header, gold-chevron back). No
tab change, no deep-link config change.

---

## 9. Freshness & error handling

| Case | Where | Handling |
|---|---|---|
| client has no project | `listMyProjects()` returns `[]` | `<EmptyView message="No projects found." />` — not an error |
| `404` | `getMyProject(id)` (project archived-hard or wrong owner) | `<ErrorView>` with retry; if the id came from a stale persisted `selectedProjectId`, the Profile fallback to `projects[0]` already covers the common case |
| network / 503 | any | axios interceptor retries 503 once; otherwise `<ErrorView error={error} onRetry={refetch} />` |
| admin advanced a stage | app | picked up on next `staleTime` expiry, pull-to-refresh, or the optional 60 s poll |

Reuse `getErrorMessage(error)` from `src/api/client.ts` and the `StateView` components —
same as every other screen.

---

## 10. No new dependencies

`Select`, `Card`, `Screen`, `Text`, `Badge`, `Button`, `SectionHeader`, `StateView`
(`LoadingView` / `EmptyView` / `ErrorView`), `formatDate` (`src/utils/format.ts`),
`useIsAppActive` (`src/features/chat/`), `@react-native-async-storage/async-storage`, and
RN core `Animated` all already exist. **JS-only change — a Metro reload is enough, no
native rebuild.**

---

## 11. Manual test

Pre-req: backend `project-progress-backend-spec.md` deployed; an admin has run
`POST /api/admin/projects` twice for your client account (`§9` of that doc).

1. Log in as the client → **Profile** → "Project progress" card shows the newest
   project's name, `current_stage_label`, progress bar, and the 6-dot rail.
2. Because there are 2 projects, the **Project** dropdown appears → switch to the other
   project → card updates. Kill and reopen the app → the **same** project is still
   selected.
3. Tap the card → `ProjectDetailScreen` → the full vertical pipeline renders `done` /
   current / `pending` nodes; a stage with a note shows it.
4. Tap **Open project team chat** → lands in the project's `ChatRoom` (title = project
   name) → open **Details** → search + add a registered teammate (existing flow).
5. Ask the admin to `PATCH …/stages/{key}` a stage → pull-to-refresh the detail screen →
   the node advances.
6. `npx tsc --noEmit` and `npx eslint src` clean.

---

## 12. Out of scope for this drop (future phase)

Client-side project creation / editing; invite-by-email for teammates without an account
(`project-progress-backend-spec.md` §10); a projects **tab** (v1 lives under Profile);
per-stage deliverable links / file lists; push notification on stage change; an activity
feed.

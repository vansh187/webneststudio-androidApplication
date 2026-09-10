# Client Project Progress — Backend Build, DB Patch & SDLC Pipeline Spec

**Audience:** FastAPI / backend team
**Repo:** `vansh187/WebNestStudioBackend`, branch `main` (Render auto-deploys on push)
**Related:** `project-progress-frontend-integration.md` (React Native side) · `chat-backend-spec.md` (the `/api/messaging` chat this hooks into)

The studio wants clients to see, inside the app, **which project WebNest is building for
them and how far along it is**. An admin creates a project against a client's **email**,
gives it a **name**, and drives it through the six **SDLC stages** (Requirements → Design
→ Development → Testing → Deployment → Maintenance). Each project also gets its own
**team group chat** (the client is the owner and adds their own people). A client can
have **several projects**; the app shows a picker.

This replaces the flat, single-row `project_status` concept with a real `Project`
aggregate. `GET /api/me/project-status` stays working as a deprecated shim so older app
builds don't break.

Stack already in place: FastAPI + SQLAlchemy 2.0 async + asyncpg on Supabase Postgres,
python-jose JWT bearer auth, `RoleChecker` (`require_admin` / `require_client`). Layering
to mirror exactly: `api/*_router.py → services/*_service.py → database/*_persistence.py
(BasePersistence)`.

> **New names only.** This feature adds `Project` / `ProjectStage`, tables `projects` /
> `project_stages`, service `ProjectService`, persistence `ProjectPersistence`. The only
> change to an existing table is **one nullable column** `conversations.project_id`
> (`chat-backend-spec.md` gets a matching addendum). **Nothing ALTERs `users`.** Do not
> touch `ProjectStatus` / `project_status` — it is kept and read by the §8 shim.

---

## 1. SDLC stage constant

The pipeline is a fixed, ordered list. Put it in a new `core/constants.py` (or the top
of `services/project_service.py`):

```python
SDLC_STAGES: list[tuple[str, str]] = [
    ("requirements", "Requirements"),
    ("design",       "Design"),
    ("development",   "Development"),
    ("testing",       "Testing"),
    ("deployment",    "Deployment"),
    ("maintenance",   "Maintenance"),
]
SDLC_STAGE_KEYS = [k for k, _ in SDLC_STAGES]          # ordering + CHECK constraint source
SDLC_STAGE_LABELS = dict(SDLC_STAGES)
```

Every project is seeded with **all six** `project_stages` rows at creation, so the app
always renders the full pipeline (completed / current / upcoming) with no client-side
stage list.

---

## 2. Database patch

`app.py` lifespan runs `Base.metadata.create_all` → **the two new tables auto-create on
deploy. No manual migration step is required.** The raw SQL in §2b is for review, or if
the team prefers to apply it explicitly against Supabase first. The only existing-table
change is `conversations.project_id` (§2c) — additive and nullable.

### 2a. SQLAlchemy models — append to `database/models.py`

```python
class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "current_stage in ('requirements','design','development','testing','deployment','maintenance')",
            name="ck_project_current_stage",
        ),
        CheckConstraint("progress_percent is null or (progress_percent between 0 and 100)",
                        name="ck_project_progress_range"),
        CheckConstraint("status in ('active','on_hold','completed','archived')", name="ck_project_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    client_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    current_stage: Mapped[str] = mapped_column(Text, nullable=False, server_default="requirements")
    progress_percent: Mapped[int | None] = mapped_column(Integer)          # NULL => compute from stages (§3)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))  # the admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    stages: Mapped[list["ProjectStage"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectStage.order_index")


class ProjectStage(Base):
    __tablename__ = "project_stages"
    __table_args__ = (
        UniqueConstraint("project_id", "key", name="uq_project_stage"),
        CheckConstraint("state in ('pending','in_progress','done')", name="ck_project_stage_state"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False, server_default="pending")
    note: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="stages")
```

### 2b. Equivalent Postgres DDL (review / manual apply)

```sql
create table if not exists projects (
  id               uuid primary key default gen_random_uuid(),
  client_user_id   uuid not null references users(id) on delete cascade,
  name             text not null,
  summary          text,
  current_stage    text not null default 'requirements'
                     check (current_stage in ('requirements','design','development','testing','deployment','maintenance')),
  progress_percent integer check (progress_percent is null or (progress_percent between 0 and 100)),
  status           text not null default 'active' check (status in ('active','on_hold','completed','archived')),
  created_by       uuid references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ix_projects_client on projects (client_user_id, updated_at desc);

create table if not exists project_stages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  key          text not null,
  label        text not null,
  order_index  integer not null,
  state        text not null default 'pending' check (state in ('pending','in_progress','done')),
  note         text,
  started_at   timestamptz,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (project_id, key)
);
create index if not exists ix_project_stages_project on project_stages (project_id, order_index);
```

Rollback: `drop table project_stages, projects cascade;`
(then, if applied, `alter table conversations drop column project_id;` — see §2c.)

### 2c. `conversations` — one additive column (also in `chat-backend-spec.md` §11)

```sql
alter table conversations add column if not exists project_id uuid
  references projects(id) on delete set null;
create unique index if not exists uq_conversations_project on conversations (project_id)
  where project_id is not null;
```
SQLAlchemy: add to the `Conversation` model
`project_id = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, unique=True)`.

### 2d. One-time back-fill from `project_status` (`migrations/003_projects.sql`, review-only)

Give every existing `project_status` row a real project so the new endpoints have data
on day one. `phase` free text maps to `current_stage='requirements'` (admins re-point it
after); the six stage rows are seeded pending.

```sql
insert into projects (id, client_user_id, name, current_stage, progress_percent, status, created_at, updated_at)
select gen_random_uuid(), ps.client_user_id,
       coalesce(nullif(ps.project_name, ''), 'WebNest project'),
       'requirements', ps.percent_complete, 'active', now(), ps.updated_at
from project_status ps;

insert into project_stages (id, project_id, key, label, order_index, state)
select gen_random_uuid(), p.id, s.key, s.label, s.ord, 'pending'
from projects p
cross join (values
  ('requirements','Requirements',0), ('design','Design',1), ('development','Development',2),
  ('testing','Testing',3), ('deployment','Deployment',4), ('maintenance','Maintenance',5)
) as s(key, label, ord);
```
No group conversations are back-filled — admins can add one later via §6.4
(`create_conversation` on the next update is out of scope; a small one-off script or a
`POST` re-run per project is fine).

---

## 3. Effective progress rule

`ProjectSummary.progress_percent` in every response is **always a resolved integer**:

```python
def effective_progress(project) -> int:
    if project.progress_percent is not None:
        return project.progress_percent
    done = sum(1 for s in project.stages if s.state == "done")
    doing = sum(1 for s in project.stages if s.state == "in_progress")
    return round(100 * (done + 0.5 * doing) / len(SDLC_STAGE_KEYS))
```

Admins may pin an explicit percent via §6.3 / §6.4; clearing it (send `null`) returns to
the computed value.

`current_stage` is likewise kept consistent by the service: after any stage edit it is
set to the **furthest non-`pending` stage** (or `requirements` if none started).

---

## 4. Shared JSON shapes

**ProjectStage**
```json
{
  "key": "design",
  "label": "Design",
  "order_index": 1,
  "state": "done",
  "note": "Figma prototype approved 12 Feb",
  "started_at": "2026-02-01T09:00:00Z",
  "completed_at": "2026-02-12T16:30:00Z",
  "updated_at": "2026-02-12T16:30:00Z"
}
```
`state` ∈ `pending | in_progress | done`. `note` / `started_at` / `completed_at` may be `null`.

**ProjectSummary** — list rows and the base of the detail object.
```json
{
  "id": "9b1e…",
  "name": "V Stitch — Website Revamp",
  "status": "active",
  "current_stage": "development",
  "current_stage_label": "Development",
  "progress_percent": 58,
  "conversation_id": "51de…",
  "updated_at": "2026-02-20T11:04:00Z"
}
```
`status` ∈ `active | on_hold | completed | archived`. `conversation_id` is the linked
team group (`null` if none). `progress_percent` is the resolved integer from §3.

**ProjectDetail** — `ProjectSummary` plus:
```json
{
  "summary": "Marketing site rebuild on Next.js + headless CMS.",
  "created_at": "2026-01-28T08:00:00Z",
  "stages": [ /* six ProjectStage objects, order_index 0→5 */ ]
}
```

**AdminProjectRow** — `ProjectSummary` plus `"client_email"` and `"client_name"` (from a
join on `users`); returned only by §6.1.

---

## 5. Client endpoints — `api/client_router.py`

Prefix `/api/me`, tag `client`. **Every endpoint** `Depends(require_client)` (the client,
or an admin acting as one). All rows are scoped to `client_user_id == current_user.id`.

### 5.1 `GET /api/me/projects`

Every project owned by the caller, newest activity first. Archived projects are included
(the app can grey them); order by `updated_at desc`.

**200**
```json
{ "projects": [ /* ProjectSummary objects, updated_at desc */ ] }
```

### 5.2 `GET /api/me/projects/{project_id}`

**200** → `ProjectDetail`
**Errors:** `404 {"detail":"Project not found"}` when the id is unknown **or** owned by a
different client (never `403` — don't leak existence).

### 5.3 `GET /api/me/project-status`  *(deprecated — kept for old app builds)*

Maps the caller's most-recently-updated **non-archived** project onto the legacy
`ProjectStatusResponse` shape:

| legacy field | source |
|---|---|
| `id` | project `id` |
| `client_user_id` | `client_user_id` |
| `project_name` | `name` |
| `phase` | `current_stage_label` |
| `percent_complete` | effective `progress_percent` (§3) |
| `updated_at` | `updated_at` |

**200** → `ProjectStatusResponse`
**Errors:** `404 {"detail":"No project found"}` when the client has no non-archived
project. Keep the existing `retry: false` / 404-is-normal contract — the app treats it as
an empty state.

> New app builds do **not** call this endpoint; it exists only so a client on an old
> binary keeps seeing their primary project until they update.

---

## 6. Admin endpoints — `api/admin_router.py`

The router already carries `dependencies=[Depends(require_admin)]`; add these under it.
Prefix `/api/admin`, tag `admin`.

### 6.1 `GET /api/admin/projects`

**Query params**
- `client_email` — optional, exact (case-insensitive) filter.
- `status` — optional, one of the four values.
- `limit` — default `20`, max `100`. `offset` — default `0`.

**200**
```json
{ "projects": [ /* AdminProjectRow objects, updated_at desc */ ], "total": 7 }
```

### 6.2 `POST /api/admin/projects`

**Request**
```json
{
  "client_email": "aditya@vstitch.in",
  "name": "V Stitch — Website Revamp",
  "summary": "Marketing site rebuild on Next.js + headless CMS.",
  "current_stage": "design",
  "create_conversation": true
}
```
- `client_email` — required; resolved via `UserPersistence.get_by_email` (trimmed,
  case-insensitive).
- `name` — required, 1–120 chars. `summary` — optional, ≤ 2000 chars.
- `current_stage` — optional, defaults `"requirements"`. Stages **before** it are seeded
  `done` (with `completed_at = now()`), the stage itself `in_progress`
  (`started_at = now()`), the rest `pending`.
- `create_conversation` — optional, default `true`. When true the service calls
  `MessagingService.create_project_conversation(owner_user_id=client.id, title=name,
  project_id=project.id)` (§7) in the **same transaction**.

**201** → `ProjectDetail`
**Errors:**
- `404 {"detail":"No user with that email"}`
- `422 {"detail":"current_stage is not a valid SDLC stage"}`
- `422` validation (name length, etc.)

### 6.3 `GET /api/admin/projects/{project_id}`

**200** → `ProjectDetail` (with `client_email` / `client_name` merged in, same as the
list rows).
**Errors:** `404 {"detail":"Project not found"}`.

### 6.4 `PATCH /api/admin/projects/{project_id}`

Partial update — send any subset.
```json
{ "name": "V Stitch — Phase 2", "summary": "…", "status": "on_hold",
  "current_stage": "testing", "progress_percent": 70, "create_conversation": true }
```
- `name` / `summary` / `status` — straightforward field writes.
- `current_stage` — cascades the six stage rows: earlier → `done`, this → `in_progress`,
  later → `pending` (timestamps set/cleared on transitions). Overrides any manual
  per-stage edits.
- `progress_percent` — integer `0–100` to pin, or `null` to fall back to the computed
  value (§3).
- `create_conversation: true` — only acts when the project has **no** linked conversation
  yet; creates one (§7). Ignored if one already exists.

**200** → `ProjectDetail`
**Errors:** `404`, `422 {"detail":"current_stage is not a valid SDLC stage"}`,
`422 {"detail":"progress_percent must be between 0 and 100"}`.

### 6.5 `PATCH /api/admin/projects/{project_id}/stages/{stage_key}`

Fine-grained control of one pipeline stage. `stage_key` ∈ the six keys.
```json
{ "state": "done", "note": "Deployed to staging, client sign-off pending." }
```
- `state` — optional; on `pending → in_progress` set `started_at = now()`; on
  `* → done` set `completed_at = now()`; on `done → *` clear `completed_at`.
- `note` — optional; `""` clears it.
- After the write the service recomputes `projects.current_stage` (furthest non-`pending`)
  and, if `progress_percent` is `null`, the response reflects the new computed value.

**200** → `ProjectDetail`
**Errors:** `404 {"detail":"Project not found"}`,
`404 {"detail":"Unknown stage"}`, `422 {"detail":"state must be pending, in_progress or done"}`.

### 6.6 `DELETE /api/admin/projects/{project_id}`

**Query param:** `hard` — default `false`.
- Soft (default): sets `status = "archived"`. The project drops out of §5.3 and reads as
  archived in §5.1. The linked group chat is **left intact**.
- `hard=true`: deletes the `projects` row (`project_stages` cascade). The linked
  conversation survives with `project_id` set to `NULL` (FK `ON DELETE SET NULL`).

**204** (no body)
**Errors:** `404`.

---

## 7. Chat integration

The client coordinates their team in the project's own group chat. Reuse the
`/api/messaging` feature (`chat-backend-spec.md`) — **no new chat endpoints**.

- **`conversations.project_id`** — nullable, unique (§2c). The single source of truth for
  the project ↔ chat link. `ProjectSummary.conversation_id` is resolved by a join
  (`select id from conversations where project_id = :pid`).
- **`MessagingService.create_project_conversation(owner_user_id, title, project_id) -> Conversation`**
  (new method, added in `chat-backend-spec.md` §11):
  - Creates a `type="group"` conversation, `created_by = owner_user_id`,
    `project_id = project_id`, one participant `(user_id=owner_user_id, role="owner")`.
  - **Idempotent per `project_id`** — if a conversation with that `project_id` already
    exists, return it unchanged (protects against a re-run of §6.2 / §6.4).
  - Runs inside the caller's transaction/session (the `ProjectService` passes its
    `AsyncSession`).
- **`Conversation` response shape** gains `"project_id": "9b1e…" | null` so the app can
  badge project groups (`chat-backend-spec.md` §5 + §11).
- **Membership** is entirely the existing chat rules (`chat-backend-spec.md` §7): the
  client is `owner`, so they rename the group and add/remove teammates through the
  existing `POST /api/messaging/conversations/{id}/participants` etc. with **zero new
  code**. Only registered, active WebNest users are addable (unchanged limitation).
- **Deletion**: archiving a project keeps its group. A hard delete nulls `project_id` and
  keeps the chat and its history.

---

## 8. Files to add / edit (mirror existing layering)

| File | Contents |
|---|---|
| `core/constants.py` (new) | `SDLC_STAGES`, `SDLC_STAGE_KEYS`, `SDLC_STAGE_LABELS` (§1) |
| `database/models.py` (append) | `Project`, `ProjectStage` (§2a); add `project_id` to `Conversation` (§2c) |
| `database/project_persistence.py` (new) | `ProjectPersistence(BasePersistence)` — `create` (insert project + `add_all` six seeded stages, one commit), `list_for_client(user_id)`, `get_for_client(user_id, project_id)` (`selectinload(Project.stages)`), `get_by_id(project_id)` (admin), `list_admin(client_email?, status?, limit, offset)` (join `users`, plus `count`), `update_project(project_id, **fields)`, `upsert_stage(project_id, key, **fields)`, `recompute_current_stage(project)`, `archive(project_id)`, `hard_delete(project_id)` |
| `database/user_persistence.py` | `get_by_email` already exists — reuse it |
| `schemas/project_schemas.py` (new) | `ProjectStageResponse`, `ProjectSummaryResponse`, `ProjectDetailResponse`, `AdminProjectRow`, `AdminProjectListResponse`, `AdminProjectCreateRequest`, `AdminProjectUpdateRequest`, `AdminStageUpdateRequest` — Pydantic v2, response models `model_config = {"from_attributes": True}` |
| `services/project_service.py` (new) | `ProjectService(session, settings)` — SDLC seeding + stage cascade, `effective_progress` / `recompute_current_stage`, `client_email` → user resolution, `_to_summary` / `_to_detail` / `_to_legacy_status` mappers, calls `MessagingService.create_project_conversation` |
| `services/messaging_service.py` (edit) | add `create_project_conversation(owner_user_id, title, project_id)` (§7; detailed in `chat-backend-spec.md` §11) |
| `core/dependencies.py` (edit) | `get_project_service(session = Depends(get_db_session))` — instantiates `MessagingService` too so §6.2/§6.4 can create the conversation |
| `api/client_router.py` (edit) | §5.1–§5.3 (5.3 replaces the current handler body with the shim mapper; keep the route + `response_model`) |
| `api/admin_router.py` (edit) | §6.1–§6.6 |
| `migrations/003_projects.sql` (new, review-only) | §2b DDL + §2c ALTER + §2d back-fill + rollback |

No new pip dependency. No change to `app.py` router registration (client + admin routers
already mounted).

---

## 9. Local test

```bash
cd .reference/backend
uvicorn app:app --reload          # projects + project_stages auto-create on startup
# open http://127.0.0.1:8000/docs
```

1. Sign up **two** users. Promote one in Postgres: `update users set role='admin' where email='<admin>';`
   Re-login that user to get an `admin` token; keep the other as `client` B.
2. **Admin:** `POST /api/admin/projects` `{ "client_email": "<B>", "name": "V Stitch — Website Revamp", "current_stage": "design" }`
   → **201**. Response has six `stages` (requirements=`done`, design=`in_progress`, rest
   `pending`), `current_stage: "design"`, and a non-null `conversation_id`.
3. In Supabase confirm: one `projects` row, six `project_stages` rows, one `conversations`
   row with `project_id` set, one `conversation_participants` row `(B, owner)`.
4. **Admin:** `PATCH /api/admin/projects/{id}/stages/design` `{ "state": "done", "note": "Approved" }`
   → `current_stage` advances to `development` (next non-done becomes current on the next
   `current_stage` set) — verify `progress_percent` recomputed (`~42`).
5. **Admin:** `PATCH /api/admin/projects/{id}` `{ "progress_percent": 70 }` → response now
   pins `70`; send `{ "progress_percent": null }` → back to computed.
6. **Admin:** `POST /api/admin/projects` again for **B** with a different `name` → B now
   has two projects.
7. **Client B:** `GET /api/me/projects` → 2 `ProjectSummary` rows, `updated_at desc`.
   `GET /api/me/projects/{id}` → full `stages`. `GET /api/me/project-status` → legacy
   shape, **200**, mapping the newest project.
8. **Client A:** `GET /api/me/projects/{B's project id}` → **404** (not `403`).
9. **Admin:** `DELETE /api/admin/projects/{id}` → **204**; B's `GET /api/me/projects` now
   shows it `archived`; `GET /api/me/project-status` skips it.
10. **Client B:** open the project's `conversation_id` via
    `GET /api/messaging/conversations/{cid}` → B is `owner`; add A with
    `POST …/participants` → succeeds (existing chat flow).

---

## 10. Out of scope for this drop (future phase)

Invite-by-email for non-registered teammates (pending-invite table + Resend email +
accept flow); admin UI to *promote* an existing `project_status` row's client to a full
project with a conversation in one call; per-stage file attachments / deliverable links;
client-visible change history / activity feed on a project; push notification when a
stage advances (rides the chat FCM phase); WebSocket / realtime progress.

# In-App Project Chat — Backend Build, DB Patch & Storage Spec

**Audience:** FastAPI / backend team
**Repo:** `vansh187/WebNestStudioBackend`, branch `main` (Render auto-deploys on push)
**Related:** `chat-frontend-integration.md` (React Native side)

The studio is moving project coordination off WhatsApp into the app. This adds
user-to-user **group chats + 1:1 DMs** with image/PDF/file attachments, reply/quote,
emoji, and unread counts. Freshness is client polling (no realtime server work);
push notifications are a later phase.

Stack already in place: FastAPI + SQLAlchemy 2.0 async + asyncpg on Supabase Postgres,
python-jose JWT bearer auth, `httpx` available. Layering to mirror exactly:
`api/*_router.py → services/*_service.py → database/*_persistence.py(BasePersistence)`.

> **Do not touch** the existing `/api/chat` + `ChatThread`/`ChatMessage` — that is the
> AI chatbot (one human ↔ LLM). This feature uses new names: `Conversation` / `Message`,
> prefix `/api/messaging`, tag `messaging`.

---

## 1. Environment variables

Add to `core/config.py` `Settings`; set values in the Render dashboard.

| Var | Example | Purpose |
|---|---|---|
| `SUPABASE_PROJECT_URL` | `https://abcd1234.supabase.co` | Storage REST base. **Different** from the existing `SUPABASE_URL` Postgres connection string. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Server-side Storage auth. Never shipped to the app. |
| `CHAT_STORAGE_BUCKET` | `chat-attachments` | Bucket name. |
| `CHAT_MAX_ATTACHMENT_MB` | `25` | Per-file size cap. |

No new pip dependency — call the Supabase Storage REST API with `httpx` (same pattern as
the existing Resend email integration).

---

## 2. Supabase Storage setup (one-time, dashboard)

1. **Storage → New bucket** → name `chat-attachments`, **Public = OFF** (private).
2. *(Optional)* bucket file-size limit `25 MB`; allowed MIME types = the allowlist in §4.
3. **No RLS policies required** — the backend uses the service-role key; the app never
   talks to Storage with a user token, only with short-lived signed URLs the backend
   mints.
4. **Object path convention** (backend-generated, never trusted from the client):
   `{user_id}/{YYYY}/{MM}/{uuid4}-{sanitized_filename}`
   Stored on the message as `url_path` (path only — no host, no token) so a fresh signed
   GET URL can be minted on every read.

---

## 3. Database patch

`app.py` lifespan runs `Base.metadata.create_all` → **the four new tables auto-create on
deploy. No manual migration step is required.** The raw SQL in §3b is provided only for
review or if the team prefers to apply it explicitly against Supabase first. **Nothing
here ALTERs an existing table** (the `users` table is untouched).

### 3a. SQLAlchemy models — append to `database/models.py`

```python
class Conversation(Base):
    __tablename__ = "conversations"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    type = mapped_column(Text, nullable=False)                       # 'group' | 'direct'
    title = mapped_column(Text, nullable=True)                       # group name; NULL for DMs
    created_by = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_message_at = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_message_preview = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (CheckConstraint("type in ('group','direct')", name="ck_conversation_type"),)

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    conversation_id = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = mapped_column(Text, nullable=False, server_default="member")   # owner | admin | member
    last_read_at = mapped_column(DateTime(timezone=True), nullable=True)
    joined_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    left_at = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_participant"),
        CheckConstraint("role in ('owner','admin','member')", name="ck_participant_role"),
    )

class Message(Base):
    __tablename__ = "messages"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    conversation_id = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = mapped_column(Text, nullable=True)                        # NULL => attachment-only message
    reply_to_message_id = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    attachments = mapped_column(JSONB, nullable=True)                # array, <= 10, shape in section 5
    is_deleted = mapped_column(Boolean, nullable=False, server_default="false")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    edited_at = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Index("ix_messages_conv_created", "conversation_id", "created_at"),)

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    message_id = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction"),)
```

Relationships:
`Conversation.participants`, `Conversation.messages` (`order_by=Message.created_at`),
`Message.reactions`, `Message.reply_to` (`remote_side=[Message.id]`).

### 3b. Equivalent Postgres DDL (review / manual apply)

```sql
create table if not exists conversations (
  id                   uuid primary key default gen_random_uuid(),
  type                 text not null check (type in ('group','direct')),
  title                text,
  created_by           uuid not null references users(id) on delete cascade,
  last_message_at      timestamptz,
  last_message_preview text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists ix_conversations_last_message_at on conversations (last_message_at desc);

create table if not exists conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner','admin','member')),
  last_read_at    timestamptz,
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  unique (conversation_id, user_id)
);
create index if not exists ix_participants_user on conversation_participants (user_id);
create index if not exists ix_participants_conversation on conversation_participants (conversation_id);

create table if not exists messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references conversations(id) on delete cascade,
  sender_id           uuid not null references users(id) on delete cascade,
  body                text,
  reply_to_message_id uuid references messages(id) on delete set null,
  attachments         jsonb,
  is_deleted          boolean not null default false,
  created_at          timestamptz not null default now(),
  edited_at           timestamptz
);
create index if not exists ix_messages_conv_created on messages (conversation_id, created_at);

create table if not exists message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists ix_reactions_message on message_reactions (message_id);
```

Rollback: `drop table message_reactions, messages, conversation_participants, conversations cascade;`

---

## 4. Attachment rules

- **Size:** each file ≤ `CHAT_MAX_ATTACHMENT_MB` (25). **Count:** 1–10 per message.
- **MIME allowlist:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`,
  `application/pdf`, `text/plain`, `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `application/vnd.ms-excel`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/zip`.
- **`kind` derivation (server-side):** `image/*` → `"image"`, `application/pdf` →
  `"pdf"`, everything else → `"file"`. The client sends its guess; the server re-derives
  and wins.

---

## 5. Shared JSON shapes

**UserSummary**
```json
{ "id": "b3f1…", "full_name": "Vansh Duggal", "email": "vansh@webneststudio.co.in" }
```

**Attachment** — as stored in `messages.attachments`; the `url` field is added only when
serialising a message for a response (fresh signed GET, ~1 h TTL).
```json
{
  "url_path": "b3f1…/2026/01/2b1c…-brief.pdf",
  "url": "https://abcd1234.supabase.co/storage/v1/object/sign/chat-attachments/b3f1…/2026/01/2b1c…-brief.pdf?token=eyJ…",
  "name": "project-brief.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 482113,
  "kind": "pdf",
  "width": null,
  "height": null
}
```

**ReactionGroup**
```json
{ "emoji": "👍", "count": 3, "reacted_by_me": true }
```

**Message**
```json
{
  "id": "9a2c…",
  "conversation_id": "51de…",
  "sender": { "id": "b3f1…", "full_name": "Vansh Duggal", "email": "vansh@webneststudio.co.in" },
  "body": "Updated the homepage hero, please review 👇",
  "attachments": [],
  "reply_to": {
    "id": "77b0…",
    "sender": { "id": "c4d2…", "full_name": "Aditya Rao", "email": "aditya@example.com" },
    "body_preview": "Can you change the CTA colour?",
    "is_deleted": false
  },
  "reactions": [ { "emoji": "👍", "count": 2, "reacted_by_me": false } ],
  "is_deleted": false,
  "created_at": "2026-01-15T09:32:11.482Z",
  "edited_at": null
}
```

**Participant**
```json
{
  "user": { "id": "b3f1…", "full_name": "Vansh Duggal", "email": "vansh@webneststudio.co.in" },
  "role": "owner",
  "joined_at": "2026-01-10T07:00:00Z",
  "last_read_at": "2026-01-15T09:33:00Z"
}
```

**Conversation**
```json
{
  "id": "51de…",
  "type": "group",
  "title": "V Stitch — Website Revamp",
  "created_by": "b3f1…",
  "participants": [ /* Participant… */ ],
  "last_message": {
    "id": "9a2c…",
    "sender_name": "Vansh Duggal",
    "preview": "Updated the homepage hero, please review",
    "created_at": "2026-01-15T09:32:11.482Z",
    "has_attachment": false
  },
  "unread_count": 4,
  "created_at": "2026-01-10T07:00:00Z",
  "updated_at": "2026-01-15T09:32:11.482Z"
}
```
For `type: "direct"`, `title` is `null` — the client shows the other participant's name.

---

## 6. Endpoints

Base URL: `https://webneststudiobackend-n00h.onrender.com`
**Every endpoint requires** `Authorization: Bearer <access_token>` (reuse
`Depends(get_current_user)`).
New routers: `api/messaging_router.py` (prefix `/api/messaging`, tag `messaging`) and
`api/users_router.py` (prefix `/api/users`). Register both in `app.py`.

### 6.1 `GET /api/messaging/conversations`

List every conversation the caller is an active participant in, newest activity first.
Unread count = messages in the conversation with `created_at > participant.last_read_at`
(use the grouped-count pattern from `database/chat_persistence.py::list_by_user`).

**200**
```json
{ "conversations": [ /* Conversation objects, ordered by last_message_at desc */ ] }
```

### 6.2 `POST /api/messaging/conversations/group`

**Request**
```json
{ "title": "V Stitch — Website Revamp", "participant_ids": ["c4d2…", "e5f3…"] }
```
`title` 1–120 chars. `participant_ids` 1–50 existing active user ids (the caller is
ignored if present). Caller is stored as `owner`; the rest as `member`.

**201** → `Conversation`
**Errors:** `400 {"detail":"One or more users could not be found"}`, `422` validation.

### 6.3 `POST /api/messaging/conversations/direct`

**Request**
```json
{ "user_id": "c4d2…" }
```
Find-or-create the 1:1 conversation between the caller and `user_id` (both stored as
`member`).

**200** (already existed) or **201** (created) → `Conversation` (`type: "direct"`)
**Errors:** `400 {"detail":"You cannot start a chat with yourself"}`,
`400 {"detail":"User not found"}`.

### 6.4 `GET /api/messaging/conversations/{conversation_id}`

**200** → `Conversation`
**Errors:** `403 {"detail":"You are not a participant in this conversation"}`,
`404 {"detail":"Conversation not found"}`.

### 6.5 `PATCH /api/messaging/conversations/{conversation_id}`

Rename a group. `owner`/`admin` only, `type: "group"` only.

**Request** `{ "title": "V Stitch — Phase 2" }`
**200** → `Conversation`
**Errors:** `403`, `409 {"detail":"Direct chats cannot be renamed"}`.

### 6.6 `POST /api/messaging/conversations/{conversation_id}/participants`

Add members. Any active participant. Re-adding someone who left clears their `left_at`.

**Request** `{ "user_ids": ["a1b2…", "f6g7…"] }`
**200** → `Conversation` (updated participant list)
**Errors:** `400` unknown user, `403`,
`409 {"detail":"Cannot add members to a direct chat"}`.

### 6.7 `DELETE /api/messaging/conversations/{conversation_id}/participants/{user_id}`

Remove a member (`owner`/`admin`), or pass your own id to **leave**. Sets `left_at`
(history is retained). If the `owner` leaves a group that still has members, ownership
passes to the earliest-joined remaining `admin`, else the earliest-joined `member`.

**204** (no body)
**Errors:** `403 {"detail":"Only group admins can remove other members"}`, `404`.

### 6.8 `GET /api/messaging/conversations/{conversation_id}/messages`

**Query params**
- `limit` — default `30`, max `100`.
- `before` — a message id; return the page of messages **older** than it (scroll-back).
- `after` — a message id; return messages **newer** than it (used by the poller).
- `before` and `after` are mutually exclusive; omit both for the latest page.

**200** — messages ascending by `created_at`
```json
{ "messages": [ /* Message… */ ], "has_more": true }
```
`has_more` = older messages exist beyond this page (relevant when paging with `before`).
**Errors:** `403`.

### 6.9 `POST /api/messaging/conversations/{conversation_id}/messages`

**Request** — at least one of `body` or `attachments` must be present.
```json
{
  "body": "Here's the revised brief 🙂",
  "reply_to_message_id": "77b0…",
  "attachments": [
    { "url_path": "b3f1…/2026/01/2b1c…-brief.pdf", "name": "project-brief.pdf",
      "mime_type": "application/pdf", "size_bytes": 482113, "kind": "pdf",
      "width": null, "height": null }
  ]
}
```
`body` ≤ 4000 chars. `attachments` 1–10, each previously returned by §6.14 and
re-validated (MIME + size). `reply_to_message_id` must be a non-deleted message in the
**same** conversation.

**201** → `Message`. Side effect: conversation `last_message_at` /
`last_message_preview` are updated in the same commit.
**Errors:** `400 {"detail":"reply_to_message_id does not belong to this conversation"}`,
`403`, `413`, `415`,
`422 {"detail":"Provide a message body or at least one attachment"}`.

### 6.10 `POST /api/messaging/conversations/{conversation_id}/read`

**Request** `{ "last_read_message_id": "9a2c…" }`
**204** — sets the caller's participant `last_read_at` to that message's `created_at`;
subsequent `unread_count` for the caller drops accordingly.
**Errors:** `403`, `404` (message not in this conversation).

### 6.11 `POST /api/messaging/messages/{message_id}/reactions`

**Request** `{ "emoji": "👍" }` — idempotent (unique constraint on
`message_id, user_id, emoji`).
**200** → `{ "message_id": "9a2c…", "reactions": [ /* ReactionGroup… */ ] }`
**Errors:** `403` (not a participant of that message's conversation), `404`.

### 6.12 `DELETE /api/messaging/messages/{message_id}/reactions/{emoji}`

`emoji` is URL-encoded (`👍` → `%F0%9F%91%8D`).
**200** → `{ "message_id": "9a2c…", "reactions": [ /* ReactionGroup… */ ] }`
**Errors:** `403`, `404`.

### 6.13 `DELETE /api/messaging/messages/{message_id}`

Soft-delete. The `sender`, or the conversation `owner`/`admin`.
**200** → `Message` with `is_deleted: true`, `body: null`, `attachments: []`,
`reactions: []`.
**Errors:** `403 {"detail":"You can only delete your own messages"}`, `404`.

### 6.14 `POST /api/messaging/attachments/sign-upload`

Mint a short-lived direct-to-Supabase upload URL. The client calls this once per file
**before** §6.9, uploads the bytes itself, then references `url_path` in the message.

**Request**
```json
{ "filename": "project-brief.pdf", "mime_type": "application/pdf", "size_bytes": 482113 }
```
Validates the MIME allowlist (§4) and size ≤ `CHAT_MAX_ATTACHMENT_MB`.

**200**
```json
{
  "url_path": "b3f1…/2026/01/2b1c…-brief.pdf",
  "storage_path": "chat-attachments/b3f1…/2026/01/2b1c…-brief.pdf",
  "upload_url": "https://abcd1234.supabase.co/storage/v1/object/upload/sign/chat-attachments/b3f1…/2026/01/2b1c…-brief.pdf?token=eyJ…",
  "method": "PUT",
  "headers": { "Content-Type": "application/pdf", "x-upsert": "true" },
  "expires_in": 120
}
```
The client then does `PUT {upload_url}` with the given headers and the raw file bytes as
the body (2xx = success).

**Errors:** `413 {"detail":"File exceeds the 25 MB limit"}`,
`415 {"detail":"File type not allowed"}`.

**Server implementation notes** — `services/storage_service.py`, `httpx`:
- **Sign upload:**
  `POST {SUPABASE_PROJECT_URL}/storage/v1/object/upload/sign/{bucket}/{path}`
  headers `Authorization: Bearer {SERVICE_ROLE_KEY}`, `apikey: {SERVICE_ROLE_KEY}` →
  `{ "url": "/object/upload/sign/{bucket}/{path}?token=…" }`.
  Prepend `{SUPABASE_PROJECT_URL}/storage/v1` to build the absolute `upload_url`.
- **Sign download** (used when serialising each message's attachments):
  `POST {SUPABASE_PROJECT_URL}/storage/v1/object/sign/{bucket}/{path}` body
  `{"expiresIn": 3600}` → `{ "signedURL": "/object/sign/…?token=…" }`.
  Prepend the same prefix to build `attachments[].url`.

### 6.15 `GET /api/users/search`

**Query params:** `q` (required, trimmed, **min 2 chars**), `limit` (default `20`,
max `50`).

**Behaviour:** case-insensitive `ILIKE` match on `full_name` **or** `email`,
`is_active = true`, **excludes the caller**. Returns **only people who already have a
WebNest Studio account** — there is no mechanism anywhere in this feature to add a
non-registered person to a chat.

**200**
```json
{ "results": [ { "id": "c4d2…", "full_name": "Aditya Rao", "email": "aditya@example.com" } ] }
```
**Errors:** `400 {"detail":"Search needs at least 2 characters"}`.

Add `search(query, exclude_user_id, limit=20)` to `database/user_persistence.py`.

---

## 7. Authorisation matrix

| Action | Who |
|---|---|
| read conversation / messages, send message, react, mark-read | any **active participant** |
| create group / DM | any authenticated user |
| rename group, remove *other* participants | `owner` or `admin` |
| add participants | any active participant |
| leave (remove self) | any participant |
| delete a message | its `sender`, or conversation `owner` / `admin` |
| search users | any authenticated user (results limited to active accounts, self excluded) |

Non-participants get `403` (never `404`) once the conversation is confirmed to exist.
`GET /conversations/{id}` returns `404` only when the id itself is unknown.

---

## 8. Files to add (mirror existing layering)

| File | Contents |
|---|---|
| `database/models.py` (append) | the 4 model classes from §3a |
| `database/messaging_persistence.py` | `MessagingPersistence(BasePersistence)` — `list_conversations_for_user`, `get_conversation`, `get_participant`, `create_conversation`, `find_direct_conversation`, `add_participants`, `remove_participant`, `list_participants`, `list_messages` (`selectinload` reactions + reply_to), `create_message` (+ bump conversation `last_message_*` same commit), `mark_read`, `add_reaction`, `remove_reaction`, `soft_delete_message` |
| `database/user_persistence.py` (append) | `search(query, exclude_user_id, limit)` |
| `schemas/messaging_schemas.py` | Pydantic request/response models for §5 + §6 |
| `services/storage_service.py` | `StorageService` — `sign_upload(...)`, `sign_download(path, expires=3600)`, MIME allowlist + size cap |
| `services/messaging_service.py` | `MessagingService` — the §7 rules; resolves `url_path` → signed `url` on read; DM dedupe; reply-target validation |
| `api/messaging_router.py` | endpoints §6.1–§6.14 |
| `api/users_router.py` | endpoint §6.15 |
| `app.py` (edit) | `include_router(messaging_router)` + `include_router(users_router)` |
| `core/config.py` (edit) | the 4 settings from §1 |

---

## 9. Local test

```bash
cd .reference/backend
uvicorn app:app --reload          # the 4 tables auto-create on startup
# open http://127.0.0.1:8000/docs
```

1. Sign up + log in **two** users; grab both bearer tokens.
2. As A: `POST /conversations/group` adding B.
3. As A: `POST …/messages` (plain text), then again with `reply_to_message_id` set.
4. As B: `POST /messages/{id}/reactions`.
5. As A: `POST /attachments/sign-upload` → `PUT` a real PDF to `upload_url` →
   `POST …/messages` with that `url_path`.
6. As B: `GET /conversations` → confirm `unread_count` > 0; open
   `GET …/messages`; `POST …/read`; `GET /conversations` again → unread cleared;
   confirm each `attachments[].url` downloads.
7. `GET /api/users/search?q=ad` → returns A/B by name/email, never the caller.
8. Confirm the 4 tables and rows exist in Supabase.

---

## 10. Out of scope for this drop (future phase)

Push notifications (FCM + device-token storage + send pipeline), typing indicators,
read-receipt avatars, message editing, message search, WebSocket transport.

---

## 11. Project-linked conversations  *(added 2026-09-10 — see `project-progress-backend-spec.md`)*

The Client Project Progress feature gives every `Project` its own **team group chat**.
It reuses this `/api/messaging` feature end to end — the only additions are one nullable
column, one internal service method, and one extra field on the `Conversation` response.
**No new endpoint.** The client is stored as `owner`, so they rename the group and
add/remove teammates through §6.5–§6.7 with no further work.

### 11.1 `conversations.project_id` — one additive column

`ALTER`, additive, nullable — runs fine on the existing table (`Base.metadata.create_all`
does **not** add columns to an existing table, so apply this one explicitly).

```sql
alter table conversations add column if not exists project_id uuid
  references projects(id) on delete set null;
create unique index if not exists uq_conversations_project on conversations (project_id)
  where project_id is not null;
```

SQLAlchemy — add to the `Conversation` model (§3a):
```python
project_id = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, unique=True)
```

`ON DELETE SET NULL` — a hard-deleted project leaves its chat and history intact, just
unlinked. `projects` is created by `project-progress-backend-spec.md` §2; if that patch
is applied first the FK resolves cleanly, otherwise apply this ALTER after it.

### 11.2 `MessagingService.create_project_conversation(...)`

```python
async def create_project_conversation(
    self, *, owner_user_id: uuid.UUID, title: str, project_id: uuid.UUID
) -> Conversation:
    """Idempotent per project. Called by ProjectService inside its own transaction."""
    existing = await self._persistence.get_conversation_by_project(project_id)
    if existing:
        return existing
    return await self._persistence.create_conversation(
        type="group",
        title=title[:120],
        created_by=owner_user_id,
        project_id=project_id,
        participants=[(owner_user_id, "owner")],
    )
```

- Add `get_conversation_by_project(project_id)` to `MessagingPersistence`
  (`select … where project_id = :pid`).
- `create_conversation` in `MessagingPersistence` gains an optional `project_id` kwarg
  (default `None`) — existing group/DM creation is unaffected.
- Same `AsyncSession` as the caller: `get_project_service` builds `MessagingService` with
  the request session so the project row and its conversation commit together.
- Idempotent: a re-run of `POST /api/admin/projects` or `PATCH …/projects/{id}` with
  `create_conversation: true` returns the existing conversation, never a duplicate (the
  partial unique index is the backstop).

### 11.3 `Conversation` response gains `project_id`

Add to the **Conversation** shape (§5) and every serialiser that emits it (§6.1–§6.7):

```json
{ "id": "51de…", "type": "group", "title": "V Stitch — Website Revamp",
  "project_id": "9b1e…", "created_by": "b3f1…", "participants": [ … ], "…": "…" }
```

`project_id` is `null` for every ordinary group and DM. The app uses it only to badge a
conversation as a project room (`chat-frontend-integration.md` addendum).

### 11.4 Authorisation — unchanged

The §7 matrix applies as-is. The project's client is `owner` (rename + remove other
members + can't be removed by anyone else; any active participant, including staff
`member`s, can add new members). WebNest staff are added as normal `member`s
(or `admin` promoted server-side) via §6.6. Only registered active users are addable —
the §6.15 constraint is unchanged; invite-by-email stays out of scope.

### 11.5 Files touched (delta on §8)

| File | Change |
|---|---|
| `database/models.py` | `Conversation.project_id` column (§11.1) |
| `database/messaging_persistence.py` | `get_conversation_by_project(project_id)`; `create_conversation(..., project_id=None)` |
| `services/messaging_service.py` | `create_project_conversation(...)` (§11.2) |
| `schemas/messaging_schemas.py` | `project_id: UUID | None` on the conversation response model |
| `api/messaging_router.py` | no change (serialiser picks up the new field) |

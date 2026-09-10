# In-App Project Chat — Frontend Integration & Endpoint Mapping

**Audience:** React Native / app team
**Repo:** `vansh187/webneststudio-androidApplication`, branch `android-develop` — `WebNestStudioApp/`
**Related:** `chat-backend-spec.md` (FastAPI side — the source of truth for payloads)

Build **group chats + 1:1 DMs** with image/PDF/file attachments, reply/quote, an emoji
picker in the composer, and unread badges. Freshness is **react-query polling** (no
websockets). Push notifications are a later phase.

All calls go through the existing axios instance `api` in `src/api/client.ts`, which
already injects the keychain bearer and handles 401-refresh / 503-retry — **nothing to
add for auth**. Add methods to the `webnestApi` object in `src/api/webnestApi.ts` in the
existing `api.get/post(...).then(r => r.data)` style.

Base URL (from `src/api/client.ts`):
`Config.API_BASE_URL || 'https://webneststudiobackend-n00h.onrender.com'`

---

## 1. Endpoint map — `webnestApi` method → HTTP → URL → consumer

| `webnestApi` method | Method | URL (relative to base) | Called from | react-query key / polling |
|---|---|---|---|---|
| `listConversations()` | GET | `/api/messaging/conversations` | `ChatListScreen`, `useUnreadCount()` (tab badge) | `['chat','conversations']`, `refetchInterval: 8000` (paused when app backgrounded) |
| `createGroup(title, participantIds)` | POST | `/api/messaging/conversations/group` | `NewGroupScreen` | mutation → `navigate('ChatRoom',{conversationId})` + `invalidate(['chat','conversations'])` |
| `createDirect(userId)` | POST | `/api/messaging/conversations/direct` | `NewChatScreen` | mutation → open `ChatRoom` |
| `getConversation(id)` | GET | `/api/messaging/conversations/{id}` | `ChatRoomScreen` header, `GroupInfoScreen` | `['chat','conversation', id]` |
| `renameConversation(id, title)` | PATCH | `/api/messaging/conversations/{id}` | `GroupInfoScreen` | mutation → `invalidate(['chat','conversation', id])` |
| `addParticipants(id, userIds)` | POST | `/api/messaging/conversations/{id}/participants` | `GroupInfoScreen` | mutation |
| `removeParticipant(id, userId)` | DELETE | `/api/messaging/conversations/{id}/participants/{userId}` | `GroupInfoScreen` (remove / "Leave group") | mutation → on self-leave `navigate` back to `ChatList` |
| `listMessages(id, {before?, after?, limit?})` | GET | `/api/messaging/conversations/{id}/messages` | `ChatRoomScreen` | `['chat','messages', id]`; `refetchInterval: 3000` while focused; `after` = newest local message id (poll), `before` = oldest local id (scroll-back) |
| `sendMessage(id, {body?, replyToMessageId?, attachments?})` | POST | `/api/messaging/conversations/{id}/messages` | `Composer` | mutation → optimistic append + `invalidate(['chat','messages', id])` + `['chat','conversations']` |
| `markRead(id, lastReadMessageId)` | POST | `/api/messaging/conversations/{id}/read` | `ChatRoomScreen` (mount + on new msg while focused) | fire-and-forget → `invalidate(['chat','conversations'])` |
| `addReaction(messageId, emoji)` | POST | `/api/messaging/messages/{messageId}/reactions` | `MessageBubble` long-press → emoji sheet | mutation → patch that message in cache with returned `reactions` |
| `removeReaction(messageId, emoji)` | DELETE | `/api/messaging/messages/{messageId}/reactions/{encodeURIComponent(emoji)}` | `MessageBubble` (tap own reaction) | mutation → patch cache |
| `deleteMessage(messageId)` | DELETE | `/api/messaging/messages/{messageId}` | `MessageBubble` long-press → Delete | mutation → replace message in cache with returned deleted form |
| `signAttachmentUpload({filename, mimeType, sizeBytes})` | POST | `/api/messaging/attachments/sign-upload` | `src/api/uploads.ts` `uploadAttachment()` | not cached |
| `searchUsers(q)` | GET | `/api/users/search?q=<q>&limit=20` | `NewChatScreen`, `NewGroupScreen`, `GroupInfoScreen` (add people) | `['users','search', q]`, `enabled: q.trim().length >= 2`, debounce 300 ms |

No message edit endpoint in v1. No websocket. All freshness is the two `refetchInterval`s
above; pause them when `AppState.currentState !== 'active'`.

Every payload shape (Conversation, Message, Attachment, ReactionGroup, Participant) is
defined in **`chat-backend-spec.md` §5** — treat that as canonical.

---

## 2. Attachment upload flow — `src/api/uploads.ts` (new; first non-axios call in the app)

```
for each picked file:
  1. res = await webnestApi.signAttachmentUpload({ filename, mimeType, sizeBytes })
  2. await fetch(res.upload_url, {
       method: res.method,                 // "PUT"
       headers: res.headers,               // { "Content-Type": mime, "x-upsert": "true" }
       body: { uri, type: mime, name },    // RN fetch accepts this file object
     })                                    // expect a 2xx
  3. collect { url_path: res.url_path, name, mime_type: mime, size_bytes,
               kind, width?, height? }
then:
  webnestApi.sendMessage(conversationId, { body, replyToMessageId, attachments: [...collected] })
```

- **Images / camera:** `react-native-image-picker` with `mediaType: 'mixed'`,
  `selectionLimit: 0`, and **file URIs (not `includeBase64`)** — base64 can't be
  streamed to Supabase.
- **PDFs / other files:** `@react-native-documents/picker`.
- **`kind`:** `'image'` for `image/*`, `'pdf'` for `application/pdf`, else `'file'`
  (the backend re-derives and wins).
- **Client-side gate:** reject > 25 MB or > 10 files before calling `signAttachmentUpload`.
- Show per-file upload progress in the `Composer`; on `413` / `415` skip that file with a
  toast and continue with the rest.

---

## 3. TypeScript types — add to `src/types/api.ts`

```ts
export type ConversationType = 'group' | 'direct';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type AttachmentKind = 'image' | 'pdf' | 'file';

export type ChatUserSummary = { id: string; full_name: string | null; email: string };

export type MessageAttachment = {
  url_path: string;
  url: string | null;            // signed GET, ~1 h — refetch the message if expired
  name: string;
  mime_type: string;
  size_bytes: number;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
};

export type MessageReactionGroup = { emoji: string; count: number; reacted_by_me: boolean };

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: ChatUserSummary;
  body: string | null;
  attachments: MessageAttachment[];
  reply_to: {
    id: string;
    sender: ChatUserSummary;
    body_preview: string | null;
    is_deleted: boolean;
  } | null;
  reactions: MessageReactionGroup[];
  is_deleted: boolean;
  created_at: string;
  edited_at: string | null;
};

export type ConversationParticipant = {
  user: ChatUserSummary;
  role: ParticipantRole;
  joined_at: string;
  last_read_at: string | null;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  title: string | null;          // null for DMs → show the other participant's name
  created_by: string;
  participants: ConversationParticipant[];
  last_message: {
    id: string;
    sender_name: string;
    preview: string;
    created_at: string;
    has_attachment: boolean;
  } | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type UserSearchResult = { id: string; full_name: string | null; email: string };
```

---

## 4. Navigation — `src/navigation/`

Add to `types.ts`:
```ts
export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { conversationId: string; title?: string };
  NewChat: undefined;
  NewGroup: { preselectedUserIds?: string[] } | undefined;
  GroupInfo: { conversationId: string };
};
```

In `RootNavigator.tsx`:
- Add `Chat` as a **6th bottom tab** (Feather `message-circle`) to `MainTabParamList`
  and `MainTabs()`, rendering a nested native-stack `ChatNavigator` that reuses the
  existing `stackScreenOptions` (gold-chevron back button, flat ink header).
- Feed the tab `tabBarBadge={unread || undefined}` from a `useUnreadCount()` hook that
  sums `unread_count` across `listConversations()` (same query key as `ChatListScreen`,
  so no extra request).
- `ChatRoomScreen` must use `<Screen scroll={false}>` (plain `View` mode) + its **own**
  `KeyboardAvoidingView` + an **inverted `FlatList`** — the `Screen` component's
  Android keyboard handling only runs in ScrollView mode.

> If six tab labels crowd the bar, the fallback is folding the `Contact` tab into the
> Profile screen. Decide during review.

---

## 5. Screens & the endpoints each touches

| Screen (`src/screens/chat/`) | Endpoints used |
|---|---|
| `ChatListScreen` | `listConversations` (poll 8 s), pull-to-refresh; FAB → `NewChat` |
| `ChatRoomScreen` | `getConversation`; `listMessages` (poll 3 s, `after` / `before`); `markRead`; `sendMessage`; `addReaction` / `removeReaction`; `deleteMessage` |
| `NewChatScreen` | `searchUsers`; `createDirect`. Empty state: *"They'll show up here once they've signed up in the app"* (only registered users are searchable) |
| `NewGroupScreen` | `searchUsers` (multi-select); `createGroup` → open the new `ChatRoom` |
| `GroupInfoScreen` | `getConversation`; `renameConversation`; `addParticipants`; `removeParticipant` (incl. "Leave group"); `searchUsers` |
| `Composer` (component) | `uploads.uploadAttachment` (→ `signAttachmentUpload` + `PUT`) then `sendMessage` |

New components (`src/components/chat/`): `MessageBubble`, `ChatAvatar` (reuse
`initials()` from `src/utils/format.ts`), `Composer` (text + attach sheet + emoji
button + `ReplyPreviewStrip`), `MessageActionSheet` / `AttachmentSourceSheet` (reuse
the `Select` / `AppAlert` Modal pattern), `AttachmentViewer` (full-screen image;
PDF/file → hand to the system viewer via `Linking` / `Share`), `DateSeparator`.
New helper: `src/utils/chatTime.ts` (dayjs wrappers — `messageTime`, `dayLabel`,
`conversationTime`).

---

## 6. Polling & lifecycle

- `['chat','conversations']` → `refetchInterval: 8000`.
- `['chat','messages', id]` → `refetchInterval: 3000`, only while `ChatRoomScreen` is
  focused (`useIsFocused()`), fetching with `after` = id of the newest message already
  in cache so each poll is a small delta.
- Scroll-back paging: on `onEndReached` of the inverted list, fetch with
  `before` = id of the oldest cached message; stop when `has_more` is `false`.
- Add a `useIsAppActive()` helper (`AppState`) and set `refetchInterval` to `false`
  when the app is not `active`, so a backgrounded app stops polling.
- On `ChatRoomScreen`: call `markRead(id, newestMessageId)` on mount and whenever a new
  inbound message arrives while the screen is focused, then invalidate
  `['chat','conversations']` so the tab badge updates.

---

## 7. Error handling

Reuse `getErrorMessage(error)` from `src/api/client.ts` and `showAlert()` from
`src/components/AppAlert.tsx`. Handle these inline rather than as a generic alert:

| Status | Where | Handling |
|---|---|---|
| `403` | any conversation/message call | caller was removed or left → pop back to `ChatList`, `invalidate(['chat','conversations'])` |
| `413` / `415` | `signAttachmentUpload` | toast "That file is too large / not supported", skip the file, keep the rest |
| `409` | rename / add-participants | shouldn't reach the UI (DM guard) — log only |
| `400` "Search needs at least 2 characters" | `searchUsers` | guard client-side with `enabled: q.length >= 2` |

---

## 8. New dependencies — **these require a native rebuild** (not a JS-only reload)

| Package | Why |
|---|---|
| `dayjs` | relative message / conversation timestamps (`src/utils/chatTime.ts`); no date lib exists today |
| `rn-emoji-keyboard` | composer emoji button + reaction picker (pure JS, RN 0.87 safe) |
| `@react-native-documents/picker` | pick PDFs / arbitrary files (native autolink) |

Also update `android/app/src/main/AndroidManifest.xml`: add a `FileProvider`
`<provider>` + `res/xml/file_paths.xml` (needed by the document picker / share-out).
Add `READ_MEDIA_IMAGES` only if the image picker needs it on the test device.

Rebuild from `W:\android`:
```
adb -s <serial> reverse tcp:8081 tcp:8081
npx react-native start          # Metro
./gradlew :app:installDebug -PreactNativeArchitectures=arm64-v8a
```

---

## 9. Manual test (two accounts, two devices/emulators)

1. **A:** Chat tab → New group → search + add **B** → send a text message → long-press a
   message → Reply → send → open the emoji picker and insert an emoji → long-press →
   React → attach **a photo and a PDF** in one message.
2. **B:** Chat-tab badge appears within ~8 s → open the conversation → text, attachments
   (image thumbnail + PDF chip that opens), reactions, and the reply-quote all render →
   badge clears once opened → scroll up paginates older messages.
3. **DM dedupe:** A starts a DM with B twice → the same conversation opens both times.
4. `npx tsc --noEmit` and `npx eslint src` clean.

---

## 10. Out of scope for this drop (future phase)

Push notifications (FCM + Notifee + device-token registration), typing indicators,
read-receipt avatars, message editing, in-app PDF rendering, message search.

---

## 11. Project-linked conversations  *(added 2026-09-10 — see `project-progress-frontend-integration.md`)*

The Client Project Progress feature deep-links from a project into its **team group
chat**. That chat is an ordinary `/api/messaging` group conversation — the client is
`owner`, so `GroupInfoScreen` already lets them rename it and add/remove teammates.
**No new chat screen, no new chat endpoint.** Frontend delta:

### 11.1 `Conversation.project_id` on the type

Backend adds `project_id` to the Conversation shape (`chat-backend-spec.md` §11.3). Add
it to `src/types/api.ts`:

```ts
export type Conversation = {
  id: string;
  type: ConversationType;
  title: string | null;
  project_id: string | null;     // NEW — non-null => this is a project team room
  created_by: string;
  // …unchanged…
};
```

### 11.2 Deep link in (from the project screen)

`ProjectDetailScreen` navigates into this stack with the project's `conversation_id`:

```ts
navigation.navigate('Chat', {
  screen: 'ChatRoom',
  params: { conversationId, title: projectName },
});
```

Works with the existing `MainTabParamList.Chat: NavigatorScreenParams<ChatStackParamList>`
— no navigation change on the chat side. `ChatRoomScreen` already reads
`route.params.conversationId` / `title`.

### 11.3 Optional — badge a project room

Cosmetic, not required for v1. Where a conversation is rendered with `project_id != null`:
- `ChatListScreen` row — a small gold "Project" `Badge` next to the title.
- `ChatRoomScreen` header — same badge under the title.
No data wiring beyond reading the field that now comes back on every
`listConversations()` / `getConversation()` response.

### 11.4 No new work on add-member

The customer adds teammates through the **existing** `GroupInfoScreen` path
(`searchUsers` → `addParticipants`, §1 / §5). Only registered users are searchable —
unchanged. Nothing to build here; just point users at "Details" from the project screen's
hint text.

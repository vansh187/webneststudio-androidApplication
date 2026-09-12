export type User = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Service = {
  id: string;
  title: string | null;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  icon_url: string | null;
  tech_tags: string[] | null;
  display_order: number | null;
  is_published: boolean;
};

export type PortfolioItem = {
  id: string;
  title: string | null;
  slug: string;
  category: string | null;
  short_description: string | null;
  full_description: string | null;
  tech_stack: string[] | null;
  cover_image_url: string | null;
  gallery_urls: string[] | null;
  result_metrics: string | null;
  client_name: string | null;
  display_order: number | null;
  is_published: boolean;
};

export type BlogPost = {
  id: string;
  title: string | null;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  word_count: number | null;
};

export type Faq = {
  id: string;
  question: string | null;
  answer: string | null;
  category: string | null;
  display_order: number | null;
  is_published: boolean;
};

export type LeadPayload = {
  source: 'contact_form' | 'start_project';
  full_name: string;
  email: string;
  phone_number: string;
  project_type?: string;
  budget_range?: string;
  message: string;
  consent_given: true;
};

/**
 * @deprecated Legacy flat project status. Superseded by `ProjectSummary` /
 * `ProjectDetail` below and the `/api/me/projects` endpoints. The backend keeps
 * `/api/me/project-status` alive only for older app builds; nothing in the app
 * reads this type any more.
 */
export type ProjectStatus = {
  id: string;
  client_user_id: string;
  project_name: string | null;
  phase: string | null;
  percent_complete: number | null;
  updated_at: string;
};

/* -------------------------------------------------------------- projects --- */
// Wire shapes for /api/me/projects + /api/me/projects/{id}. As with chat, the
// render layer treats every field as possibly-absent — see
// `src/features/projects/normalize.ts`, which every screen goes through.

export type SdlcStageKey =
  | 'requirements'
  | 'design'
  | 'development'
  | 'testing'
  | 'deployment'
  | 'maintenance';

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
  progress_percent: number; // already resolved 0-100 by the backend
  conversation_id: string | null; // linked team group chat, if any
  updated_at: string;
};

export type ProjectDetail = ProjectSummary & {
  summary: string | null;
  created_at: string;
  stages: ProjectStage[]; // always the full 6, order_index 0->5
};

/* ------------------------------------------------------------ admin: projects --- */
// Wire shapes for /api/admin/projects. Admin-only — see AuthContext role gate.

export type AdminProjectRow = ProjectDetail & {
  client_email: string;
  client_name: string | null;
};

export type AdminProjectCreatePayload = {
  client_email: string;
  name: string;
  summary?: string;
  current_stage?: SdlcStageKey;
  create_conversation?: boolean;
};

export type AdminProjectUpdatePayload = {
  name?: string;
  summary?: string;
  status?: ProjectLifecycleStatus;
  current_stage?: SdlcStageKey;
  progress_percent?: number | null;
  create_conversation?: boolean;
};

/* ------------------------------------------------------------------ chat --- */
// Wire shapes for the /api/messaging + /api/users/search endpoints. Every field
// is treated as possibly-absent at the render layer — the app never assumes the
// server sent a well-formed object.

export type ConversationType = 'group' | 'direct';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type AttachmentKind = 'image' | 'pdf' | 'video' | 'audio' | 'file';

export type ChatUserSummary = {
  id: string;
  full_name: string | null;
  email: string;
};

export type MessageAttachment = {
  url_path: string;
  url: string | null; // signed GET (~1h). Re-fetch the message if it 403s.
  name: string;
  mime_type: string;
  size_bytes: number;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
};

export type MessageReactionGroup = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type ChatMessageReplyRef = {
  id: string;
  sender: ChatUserSummary;
  body_preview: string | null;
  is_deleted: boolean;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: ChatUserSummary;
  body: string | null;
  attachments: MessageAttachment[];
  reply_to: ChatMessageReplyRef | null;
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

export type ConversationLastMessage = {
  id: string;
  sender_name: string;
  preview: string;
  created_at: string;
  has_attachment: boolean;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  title: string | null; // null for DMs -> show the other participant's name
  project_id?: string | null; // non-null => this group is a project team room
  created_by: string;
  participants: ConversationParticipant[];
  last_message: ConversationLastMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type UserSearchResult = {
  id: string;
  full_name: string | null;
  email: string;
};

export type MessageReport = {
  id: string;
  message_id: string;
  reporter: ChatUserSummary;
  reported_user: ChatUserSummary;
  reason: string;
  status: 'open' | 'resolved';
  message_preview: string | null;
  message_deleted: boolean;
  created_at: string;
};

export type BlockUserResult = {
  id: string;
  is_active: boolean;
};

/** Payload the app builds for POST /conversations/{id}/messages. */
export type OutgoingAttachment = {
  url_path: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  kind: AttachmentKind;
  width?: number | null;
  height?: number | null;
};

export type SignedUploadTarget = {
  url_path: string;
  storage_path: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  expires_in: number;
};

import { api } from './client';
import {
  AdminProjectCreatePayload,
  AdminProjectRow,
  AdminProjectUpdatePayload,
  BlockUserResult,
  BlogPost,
  ChatMessage,
  Conversation,
  Faq,
  LeadPayload,
  MessageReactionGroup,
  MessageReport,
  OutgoingAttachment,
  PortfolioItem,
  ProjectDetail,
  ProjectSummary,
  Service,
  SignedUploadTarget,
  TokenResponse,
  User,
  UserSearchResult,
} from '../types/api';

type MessagePage = { messages: ChatMessage[]; has_more: boolean };
type ReactionResult = { message_id: string; reactions: MessageReactionGroup[] };

export const webnestApi = {
  login: (email: string, password: string) =>
    api
      .post<TokenResponse>('/api/auth/login', { email, password })
      .then(response => response.data),
  signup: (payload: {
    full_name?: string;
    email: string;
    phone_number?: string;
    password: string;
  }) => api.post<User>('/api/auth/signup', payload).then(response => response.data),
  verifyOtp: (email: string, otpCode: string) =>
    api
      .post<User>('/api/auth/verify-otp', {
        email,
        otp_code: otpCode,
        purpose: 'signup',
      })
      .then(response => response.data),
  resendOtp: (email: string) =>
    api
      .post('/api/auth/resend-otp', { email, purpose: 'signup' })
      .then(response => response.data),
  me: () => api.get<User>('/api/auth/me').then(response => response.data),
  deleteAccount: () => api.delete('/api/auth/me').then(response => response.data),
  servicesPreview: () =>
    api
      .get<Service[]>('/api/home/services-preview', { params: { limit: 4 } })
      .then(response => response.data),
  featuredWork: () =>
    api
      .get<PortfolioItem[]>('/api/home/featured-work', { params: { limit: 4 } })
      .then(response => response.data),
  stats: () =>
    api.get<Record<string, number | string>>('/api/home/stats').then(response => response.data),
  services: () => api.get<Service[]>('/api/services').then(response => response.data),
  portfolio: (category?: string) =>
    api
      .get<PortfolioItem[]>('/api/portfolio', {
        params: category ? { category } : undefined,
      })
      .then(response => response.data),
  portfolioDetail: (slug: string) =>
    api.get<PortfolioItem>(`/api/portfolio/${slug}`).then(response => response.data),
  blog: (tag?: string) =>
    api
      .get<BlogPost[]>('/api/blog', { params: tag ? { tag } : undefined })
      .then(response => response.data),
  blogDetail: (slug: string) =>
    api.get<BlogPost>(`/api/blog/${slug}`).then(response => response.data),
  faqs: () => api.get<Faq[]>('/api/faqs').then(response => response.data),
  submitLead: (payload: LeadPayload) =>
    api.post('/api/leads', payload).then(response => response.data),
  files: () => api.get<unknown[]>('/api/me/files').then(response => response.data),

  /* ----------------------------------------------------------- projects --- */

  listMyProjects: () =>
    api
      .get<{ projects: ProjectSummary[] }>('/api/me/projects')
      .then(response => response.data?.projects ?? []),

  getMyProject: (id: string) =>
    api.get<ProjectDetail>(`/api/me/projects/${id}`).then(response => response.data),

  /* ------------------------------------------------------ admin: projects --- */

  adminListProjects: (
    opts: { clientEmail?: string; status?: string; limit?: number; offset?: number } = {},
  ) =>
    api
      .get<{ projects: AdminProjectRow[]; total: number }>('/api/admin/projects', {
        params: {
          client_email: opts.clientEmail || undefined,
          status: opts.status || undefined,
          limit: opts.limit ?? 20,
          offset: opts.offset ?? 0,
        },
      })
      .then(response => ({
        projects: response.data?.projects ?? [],
        total: response.data?.total ?? 0,
      })),

  adminGetProject: (id: string) =>
    api.get<AdminProjectRow>(`/api/admin/projects/${id}`).then(response => response.data),

  adminCreateProject: (payload: AdminProjectCreatePayload) =>
    api
      .post<AdminProjectRow>('/api/admin/projects', {
        client_email: payload.client_email,
        name: payload.name,
        summary: payload.summary,
        current_stage: payload.current_stage,
        create_conversation: payload.create_conversation,
      })
      .then(response => response.data),

  adminUpdateProject: (id: string, payload: AdminProjectUpdatePayload) =>
    api.patch<AdminProjectRow>(`/api/admin/projects/${id}`, payload).then(response => response.data),

  adminUpdateProjectStage: (
    id: string,
    stageKey: string,
    payload: { state?: 'pending' | 'in_progress' | 'done'; note?: string },
  ) =>
    api
      .patch<AdminProjectRow>(`/api/admin/projects/${id}/stages/${stageKey}`, payload)
      .then(response => response.data),

  adminArchiveProject: (id: string) =>
    api.delete(`/api/admin/projects/${id}`).then(response => response.data),

  /* --------------------------------------------------------------- chat --- */

  listConversations: () =>
    api
      .get<{ conversations: Conversation[] }>('/api/messaging/conversations')
      .then(response => response.data?.conversations ?? []),

  createGroup: (title: string, participantIds: string[]) =>
    api
      .post<Conversation>('/api/messaging/conversations/group', {
        title,
        participant_ids: participantIds,
      })
      .then(response => response.data),

  createDirect: (userId: string) =>
    api
      .post<Conversation>('/api/messaging/conversations/direct', { user_id: userId })
      .then(response => response.data),

  getConversation: (id: string) =>
    api
      .get<Conversation>(`/api/messaging/conversations/${id}`)
      .then(response => response.data),

  renameConversation: (id: string, title: string) =>
    api
      .patch<Conversation>(`/api/messaging/conversations/${id}`, { title })
      .then(response => response.data),

  addParticipants: (id: string, userIds: string[]) =>
    api
      .post<Conversation>(`/api/messaging/conversations/${id}/participants`, {
        user_ids: userIds,
      })
      .then(response => response.data),

  removeParticipant: (id: string, userId: string) =>
    api
      .delete(`/api/messaging/conversations/${id}/participants/${userId}`)
      .then(response => response.data),

  listMessages: (
    id: string,
    opts: { before?: string; after?: string; limit?: number } = {},
  ) =>
    api
      .get<MessagePage>(`/api/messaging/conversations/${id}/messages`, {
        params: {
          before: opts.before,
          after: opts.after,
          limit: opts.limit ?? 30,
        },
      })
      .then(response => ({
        messages: response.data?.messages ?? [],
        has_more: Boolean(response.data?.has_more),
      })),

  sendMessage: (
    id: string,
    payload: { body?: string; replyToMessageId?: string; attachments?: OutgoingAttachment[] },
  ) =>
    api
      .post<ChatMessage>(`/api/messaging/conversations/${id}/messages`, {
        body: payload.body,
        reply_to_message_id: payload.replyToMessageId,
        attachments: payload.attachments,
      })
      .then(response => response.data),

  markRead: (id: string, lastReadMessageId: string) =>
    api
      .post(`/api/messaging/conversations/${id}/read`, {
        last_read_message_id: lastReadMessageId,
      })
      .then(response => response.data),

  addReaction: (messageId: string, emoji: string) =>
    api
      .post<ReactionResult>(`/api/messaging/messages/${messageId}/reactions`, { emoji })
      .then(response => response.data),

  removeReaction: (messageId: string, emoji: string) =>
    api
      .delete<ReactionResult>(
        `/api/messaging/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      )
      .then(response => response.data),

  deleteMessage: (messageId: string) =>
    api
      .delete<ChatMessage>(`/api/messaging/messages/${messageId}`)
      .then(response => response.data),

  reportMessage: (messageId: string, reason: string) =>
    api
      .post<MessageReport>(`/api/messaging/messages/${messageId}/report`, { reason })
      .then(response => response.data),

  /* --------------------------------------------------- admin: moderation --- */

  adminListReports: (status: 'open' | 'resolved' = 'open') =>
    api
      .get<{ reports: MessageReport[] }>('/api/admin/reports', { params: { status } })
      .then(response => response.data?.reports ?? []),

  adminResolveReport: (reportId: string) =>
    api
      .post<MessageReport>(`/api/admin/reports/${reportId}/resolve`)
      .then(response => response.data),

  adminBlockUser: (userId: string) =>
    api
      .post<BlockUserResult>(`/api/admin/users/${userId}/block`)
      .then(response => response.data),

  adminUnblockUser: (userId: string) =>
    api
      .post<BlockUserResult>(`/api/admin/users/${userId}/unblock`)
      .then(response => response.data),

  searchUsers: (q: string) =>
    api
      .get<{ results: UserSearchResult[] }>('/api/users/search', {
        params: { q, limit: 20 },
      })
      .then(response => response.data?.results ?? []),

  signAttachmentUpload: (input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }) =>
    api
      .post<SignedUploadTarget>('/api/messaging/attachments/sign-upload', {
        filename: input.filename,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
      })
      .then(response => response.data),
};

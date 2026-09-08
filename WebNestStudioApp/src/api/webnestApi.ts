import { api } from './client';
import {
  BlogPost,
  Faq,
  LeadPayload,
  PortfolioItem,
  ProjectStatus,
  Service,
  TokenResponse,
  User,
} from '../types/api';

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
  projectStatus: () =>
    api.get<ProjectStatus>('/api/me/project-status').then(response => response.data),
  files: () => api.get<unknown[]>('/api/me/files').then(response => response.data),
};

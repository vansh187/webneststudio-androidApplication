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

export type ProjectStatus = {
  id: string;
  client_user_id: string;
  project_name: string | null;
  phase: string | null;
  percent_complete: number | null;
  updated_at: string;
};

import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Signup: undefined;
  Login: undefined;
  /** `sendCode`: request a fresh code on arrival (the signup one may have expired). */
  VerifyOtp: { email: string; sendCode?: boolean };
  ForgotPassword: { email?: string } | undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Services: undefined;
  Story: undefined;
  ProjectInquiry: undefined;
  VisitingCard: undefined;
  PortfolioDetail: { slug: string; title?: string | null };
  BlogDetail: { slug: string; title?: string | null };
  ProjectDetail: { projectId: string };
  AdminProjects: undefined;
  AdminAssignProject: undefined;
  AdminProjectDetail: { projectId: string };
  AdminReports: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { conversationId: string; title?: string };
  NewChat: undefined;
  NewGroup: undefined;
  GroupInfo: { conversationId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Work: undefined;
  Blog: undefined;
  Chat: NavigatorScreenParams<ChatStackParamList> | undefined;
  Contact: undefined;
  Profile: undefined;
};

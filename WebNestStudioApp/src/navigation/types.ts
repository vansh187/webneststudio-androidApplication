import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Signup: undefined;
  Login: undefined;
  VerifyOtp: { email: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
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

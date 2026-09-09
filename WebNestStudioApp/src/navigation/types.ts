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
};

export type MainTabParamList = {
  Home: undefined;
  Work: undefined;
  Blog: undefined;
  Contact: undefined;
  Profile: undefined;
};

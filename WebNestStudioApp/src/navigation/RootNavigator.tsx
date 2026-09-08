import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';

import { Gradient } from '../components/Gradient';
import { BlogDetailScreen } from '../screens/BlogDetailScreen';
import { BlogScreen } from '../screens/BlogScreen';
import { ContactScreen } from '../screens/ContactScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PortfolioDetailScreen } from '../screens/PortfolioDetailScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { VisitingCardScreen } from '../screens/VisitingCardScreen';
import { useAuth } from '../features/auth/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { font } from '../theme/typography';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, string> = {
  Home: 'home',
  Work: 'grid',
  Blog: 'book-open',
  Contact: 'send',
  Profile: 'user',
};

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgBase,
    card: colors.bgBase,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.goldPrimary,
    notification: colors.goldBright,
  },
};

/* ---------------------------------------------------------------- Tab bar --- */

function TabBarBackground() {
  // Seamless with the app body — a soft upward fade into the base ink plus a
  // hairline of gold, instead of a flat contrasting panel.
  return (
    <View style={styles.tabBarBg}>
      <Gradient
        colors={['rgba(5,6,9,0)', colors.bgBase, colors.bgBase]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tabBarHairline} />
    </View>
  );
}

function tabScreenOptions({ route }: { route: { name: keyof MainTabParamList } }) {
  return {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarBackground: () => <TabBarBackground />,
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      height: 74,
      paddingBottom: 14,
      paddingTop: 12,
    },
    tabBarActiveTintColor: colors.goldPrimary,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarLabelStyle: {
      fontFamily: font.display,
      fontSize: 10,
      fontWeight: '700' as const,
      letterSpacing: 1,
    },
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
        <Icon name={tabIcons[route.name]} color={color} size={19} />
      </View>
    ),
  };
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Work" component={PortfolioScreen} />
      <Tab.Screen name="Blog" component={BlogScreen} />
      <Tab.Screen name="Contact" component={ContactScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/* --------------------------------------------------------------- Headers --- */

function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => navigation.goBack()}
      style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}>
      <Icon name="chevron-left" size={20} color={colors.goldPrimary} />
    </Pressable>
  );
}

function HeaderBackground() {
  // Same ink as the body so the header reads as part of the page, not a bar.
  return <View style={styles.headerBg} />;
}

const stackScreenOptions: NativeStackNavigationOptions = {
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  headerTintColor: colors.textPrimary,
  headerBackground: () => <HeaderBackground />,
  headerLeft: () => <HeaderBackButton />,
  headerTitleStyle: {
    fontFamily: font.serif,
    fontWeight: '600',
    fontSize: 18,
  },
  contentStyle: { backgroundColor: colors.bgBase },
};

function AppStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Services" component={ServicesScreen} options={{ title: 'Services' }} />
      <Stack.Screen name="Story" component={StoryScreen} options={{ title: 'Our Story' }} />
      <Stack.Screen
        name="VisitingCard"
        component={VisitingCardScreen}
        options={{ title: 'Visiting Card' }}
      />
      <Stack.Screen
        name="PortfolioDetail"
        component={PortfolioDetailScreen}
        options={({ route }) => ({ title: route.params.title || 'Project' })}
      />
      <Stack.Screen
        name="BlogDetail"
        component={BlogDetailScreen}
        options={({ route }) => ({ title: route.params.title || 'Article' })}
      />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { booting, isAuthenticated } = useAuth();

  return (
    <NavigationContainer theme={navTheme}>
      {booting ? <SplashScreen /> : isAuthenticated ? <AppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Header
  headerBg: {
    backgroundColor: colors.bgBase,
    flex: 1,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderColor: colors.borderAccent,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  // Tab bar
  tabBarBg: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  tabBarHairline: {
    backgroundColor: 'rgba(230,172,62,0.22)',
    height: StyleSheet.hairlineWidth * 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tabIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    height: 34,
    width: 44,
  },
  tabIconActive: {
    backgroundColor: colors.surfaceGold,
  },
});

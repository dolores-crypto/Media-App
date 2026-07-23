import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '@/screens/FeedScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { ProfileHomeScreen } from '@/screens/ProfileScreen';
import { colors } from '@/theme/theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = { Feed: '🏠', Search: '🔍', ProfileHomeScreen: '👤' };

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name] ?? '•'}</Text>,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Feed' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="ProfileHomeScreen" component={ProfileHomeScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

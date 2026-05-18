import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../src/theme';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useAppStore } from '../../src/store/useAppStore';

import { Feather } from '@expo/vector-icons';
import { CustomTabBar } from '../../src/components/ui/CustomTabBar';

const Home = (props: any) => <Feather name="home" {...props} />;
const Search = (props: any) => <Feather name="search" {...props} />;
const Calendar = (props: any) => <Feather name="calendar" {...props} />;
const Bookmark = (props: any) => <Feather name="bookmark" {...props} />;
const User = (props: any) => <Feather name="user" {...props} />;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const theme = useAppStore(state => state.theme);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          tabBarIcon: ({ color, size }) => <Bookmark color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
});

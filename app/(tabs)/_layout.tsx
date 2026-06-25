import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TabBarProfileIcon } from '../../src/components/TabBarProfileIcon';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: '',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="add-circle-outline" size={size + 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabBarProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0057A8',
        tabBarInactiveTintColor: '#8A8A8A',
        headerStyle: { backgroundColor: '#0019A8' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trains"
        options={{
          title: 'Live',
          headerTitle: 'Live trains',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="train" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          headerTitle: 'Plan a journey',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          headerTitle: 'Line status',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

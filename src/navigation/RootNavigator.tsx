import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useFavoritesStore } from '../state/favoritesStore';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { FlightDetailScreen } from '../screens/FlightDetailScreen';
import { FlightListScreen } from '../screens/FlightListScreen';
import type { FavoritesStackParamList, FlightsStackParamList, RootTabParamList } from './types';

const FlightsStack = createNativeStackNavigator<FlightsStackParamList>();
const FavoritesStack = createNativeStackNavigator<FavoritesStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const detailOptions = { title: 'Uçuş detayı', headerBackTitle: 'Geri' };

function FlightsStackScreen() {
  return (
    <FlightsStack.Navigator>
      <FlightsStack.Screen name="FlightList" component={FlightListScreen} options={{ title: 'İstanbul → Antalya' }} />
      <FlightsStack.Screen name="FlightDetail" component={FlightDetailScreen} options={detailOptions} />
    </FlightsStack.Navigator>
  );
}

function FavoritesStackScreen() {
  return (
    <FavoritesStack.Navigator>
      <FavoritesStack.Screen name="FavoriteList" component={FavoritesScreen} options={{ title: 'Favoriler' }} />
      <FavoritesStack.Screen name="FlightDetail" component={FlightDetailScreen} options={detailOptions} />
    </FavoritesStack.Navigator>
  );
}

export function RootNavigator() {
  const favoriteCount = useFavoritesStore(s => s.items.length);
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="FlightsTab"
        component={FlightsStackScreen}
        options={{
          title: 'Uçuşlar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✈︎</Text>,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackScreen}
        options={{
          title: 'Favoriler',
          tabBarBadge: favoriteCount > 0 ? favoriteCount : undefined,
          tabBarAccessibilityLabel: `Favoriler, ${favoriteCount} uçuş`,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>★</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

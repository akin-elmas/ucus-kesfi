import type { NavigatorScreenParams } from '@react-navigation/native';

export type FlightsStackParamList = {
  FlightList: undefined;
  FlightDetail: { id: string };
};

export type FavoritesStackParamList = {
  FavoriteList: undefined;
  FlightDetail: { id: string };
};

export type RootTabParamList = {
  FlightsTab: NavigatorScreenParams<FlightsStackParamList>;
  FavoritesTab: NavigatorScreenParams<FavoritesStackParamList>;
};

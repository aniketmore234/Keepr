import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  AddMemory: undefined;
  MemoryChatbot: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type RoutePropType = RouteProp<RootStackParamList>; 
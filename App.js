import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import AddMemoryScreen from './src/screens/AddMemoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import MemoryDetailScreen from './src/screens/MemoryDetailScreen';

const Stack = createStackNavigator();

const theme = {
  colors: {
    primary: '#6200EE',
    accent: '#03DAC6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#000000',
    disabled: '#C4C4C4',
    placeholder: '#666666',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'My Memories' }}
          />
          <Stack.Screen 
            name="AddMemory" 
            component={AddMemoryScreen} 
            options={{ title: 'Add Memory' }}
          />
          <Stack.Screen 
            name="Search" 
            component={SearchScreen} 
            options={{ title: 'Search Memories' }}
          />
          <Stack.Screen 
            name="MemoryDetail" 
            component={MemoryDetailScreen} 
            options={{ title: 'Memory Details' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
} 
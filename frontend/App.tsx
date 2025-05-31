/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AddMemoryScreen from './src/screens/AddMemoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import MemoryListScreen from './src/screens/MemoryListScreen';

const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Add') {
                iconName = 'add-circle';
              } else if (route.name === 'Search') {
                iconName = 'search';
              } else if (route.name === 'Memories') {
                iconName = 'photo-library';
              }

              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6200ee',
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: '#6200ee',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen 
            name="Add" 
            component={AddMemoryScreen} 
            options={{ title: 'Add Memory' }}
          />
          <Tab.Screen 
            name="Search" 
            component={SearchScreen} 
            options={{ title: 'Search' }}
          />
          <Tab.Screen 
            name="Memories" 
            component={MemoryListScreen} 
            options={{ title: 'All Memories' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;

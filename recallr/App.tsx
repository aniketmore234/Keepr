import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types/navigation';
import AddMemoryScreen from './src/pages/AddMemoryScreen/AddMemoryScreen';
import MemoryChatbotScreen from './src/pages/MemoryChatbotScreen/MemoryChatbotScreen';
import Header from './src/components/Header';
import Footer from './src/components/Footer';

const Stack = createNativeStackNavigator<RootStackParamList>();

const ScreenLayout = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaView style={styles.container}>
    <Header />
    <View style={styles.content}>
      {children}
    </View>
    <Footer />
  </SafeAreaView>
);

const WrappedAddMemoryScreen = () => (
  <ScreenLayout>
    <AddMemoryScreen />
  </ScreenLayout>
);

const WrappedMemoryChatbotScreen = () => (
  <ScreenLayout>
    <MemoryChatbotScreen />
  </ScreenLayout>
);

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AddMemory"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="AddMemory" 
          component={WrappedAddMemoryScreen}
          options={{
            contentStyle: { backgroundColor: 'white' },
          }}
        />
        <Stack.Screen 
          name="MemoryChatbot" 
          component={WrappedMemoryChatbotScreen}
          options={{
            contentStyle: { backgroundColor: 'white' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  },
});

export default App;

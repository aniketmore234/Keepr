import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import AddMemoryScreen from './src/pages/AddMemoryScreen/AddMemoryScreen';
import MemoryChatbotScreen from './src/pages/MemoryChatbotScreen/MemoryChatbotScreen';
import { sharingService } from './src/services/SharingService';
import { LoadingProvider, useLoading } from './src/contexts/LoadingContext';
import LoadingMask from './src/components/LoadingMask';
import { RootStackParamList } from './src/types/navigation';
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

// Inner app component that has access to loading context
const AppNavigator = () => {
  const { isLoading, loadingMessage, showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Set up sharing service with loading callbacks
    sharingService.setLoadingCallbacks(showLoading, hideLoading);
    
    // Initialize sharing service
    sharingService.initialize();

    // Cleanup on unmount - but don't stop listening since we want sharing to persist
    return () => {
      // Don't call stopListening() - let the service persist
      console.log('🔄 App component cleanup (not stopping sharing service)');
    };
  }, [showLoading, hideLoading]);

  return (
    <>
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
      
      {/* Global loading mask */}
      <LoadingMask visible={isLoading} message={loadingMessage} />
    </>
  );
};

const App = () => {
  return (
    <LoadingProvider>
      <AppNavigator />
    </LoadingProvider>
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

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal, Dimensions } from 'react-native';

interface LoadingMaskProps {
  visible: boolean;
  message?: string;
}

const LoadingMask: React.FC<LoadingMaskProps> = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#6750A4" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1B20',
    textAlign: 'center',
  },
});

export default LoadingMask; 
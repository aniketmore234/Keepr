import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp, RoutePropType } from '../types/navigation';

const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();

  const getScreenTitle = () => {
    switch (route.name) {
      case 'AddMemory':
        return 'Add Memory';
      case 'MemoryChatbot':
        return 'Memory Assistant';
      default:
        return 'Keepr';
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{getScreenTitle()}</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('AddMemory')}
        >
          <Text style={styles.iconText}>➕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('MemoryChatbot')}
        >
          <Text style={styles.iconText}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6750A4',
    borderBottomWidth: 1,
    borderBottomColor: '#5B4593',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B4593',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
});

export default Header; 
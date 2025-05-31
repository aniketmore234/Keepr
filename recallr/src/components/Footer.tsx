import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp, RoutePropType } from '../types/navigation';

const Footer = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.tab, route.name === 'AddMemory' && styles.activeTab]}
        onPress={() => navigation.navigate('AddMemory')}
      >
        <Text style={styles.tabIcon}>➕</Text>
        <Text style={[styles.tabText, route.name === 'AddMemory' && styles.activeText]}>
          Add Memory
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, route.name === 'MemoryChatbot' && styles.activeTab]}
        onPress={() => navigation.navigate('MemoryChatbot')}
      >
        <Text style={styles.tabIcon}>💬</Text>
        <Text style={[styles.tabText, route.name === 'MemoryChatbot' && styles.activeText]}>
          Assistant
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 20, // Add extra padding for iPhone home indicator
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    backgroundColor: '#F5F0FF',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  activeText: {
    color: '#6750A4',
    fontWeight: '600',
  },
});

export default Footer; 
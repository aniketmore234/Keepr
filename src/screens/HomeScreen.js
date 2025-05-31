import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  FAB,
  Text,
  Chip,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { ApiService } from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMemories = async () => {
    try {
      const response = await ApiService.getAllMemories();
      if (response.success) {
        setMemories(response.memories || []);
      } else {
        Alert.alert('Error', 'Failed to load memories');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMemories();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMemoryIcon = (type) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'text':
        return 'text-fields';
      case 'link':
        return 'link';
      default:
        return 'memory';
    }
  };

  const getMemoryColor = (type) => {
    switch (type) {
      case 'image':
        return '#4CAF50';
      case 'text':
        return '#2196F3';
      case 'link':
        return '#FF9800';
      default:
        return '#9C27B0';
    }
  };

  const renderMemoryCard = ({ item }) => (
    <Card
      style={styles.memoryCard}
      onPress={() => navigation.navigate('MemoryDetail', { memory: item })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Icon
            name={getMemoryIcon(item.type)}
            size={24}
            color={getMemoryColor(item.type)}
          />
          <Chip
            icon={() => <Icon name={getMemoryIcon(item.type)} size={16} color="white" />}
            mode="flat"
            style={[styles.typeChip, { backgroundColor: getMemoryColor(item.type) }]}
            textStyle={{ color: 'white', fontSize: 12 }}>
            {item.type.toUpperCase()}
          </Chip>
        </View>
        
        <Title style={styles.memoryTitle} numberOfLines={2}>
          {item.title || item.metadata?.title || 'Untitled Memory'}
        </Title>
        
        <Paragraph numberOfLines={3} style={styles.memoryDescription}>
          {item.type === 'text' ? item.content :
           item.type === 'link' ? item.description || item.url :
           item.metadata?.description || 'No description available'}
        </Paragraph>
        
        {item.metadata?.tags && item.metadata.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.metadata.tags.slice(0, 3).map((tag, index) => (
              <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                {tag}
              </Chip>
            ))}
            {item.metadata.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{item.metadata.tags.length - 3} more</Text>
            )}
          </View>
        )}
        
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </Card.Content>
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="memory" size={64} color="#C4C4C4" />
      <Title style={styles.emptyTitle}>No Memories Yet</Title>
      <Paragraph style={styles.emptyText}>
        Start capturing your memories by taking photos, adding notes, or saving links!
      </Paragraph>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('AddMemory')}
        style={styles.emptyButton}>
        Add Your First Memory
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading memories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>My Memories</Title>
        <Button
          mode="outlined"
          icon="search"
          onPress={() => navigation.navigate('Search')}
          style={styles.searchButton}>
          Search
        </Button>
      </View>

      <FlatList
        data={memories}
        renderItem={renderMemoryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={memories.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={styles.fab}
        icon="add"
        onPress={() => navigation.navigate('AddMemory')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  searchButton: {
    borderColor: '#6200EE',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  memoryCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 24,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  memoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    marginRight: 6,
    marginBottom: 4,
    backgroundColor: '#E3F2FD',
    height: 24,
  },
  tagText: {
    fontSize: 10,
    color: '#1976D2',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200EE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#6200EE',
  },
}); 
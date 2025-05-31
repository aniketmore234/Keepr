import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Card,
  ActivityIndicator,
  Chip,
  Button,
  Menu,
  Divider,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService, Memory } from '../services/api';

type SortBy = 'date' | 'type' | 'title';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'text' | 'image' | 'link';

const MemoryListScreen = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [memories, filterType, sortBy, sortOrder]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const memoriesData = await apiService.getAllMemories();
      setMemories(memoriesData);
    } catch (error) {
      console.error('Error loading memories:', error);
      Alert.alert('Error', 'Failed to load memories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMemories();
    setIsRefreshing(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...memories];

    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(memory => memory.type === filterType);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'title':
          const titleA = a.title || a.content || a.url || '';
          const titleB = b.title || b.content || b.url || '';
          comparison = titleA.localeCompare(titleB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredMemories(filtered);
  };

  const handleDeleteMemory = (memoryId: string) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteMemory(memoryId);
              setMemories(prev => prev.filter(m => m.id !== memoryId));
            } catch (error) {
              console.error('Error deleting memory:', error);
              Alert.alert('Error', 'Failed to delete memory');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'text':
        return 'text-snippet';
      case 'image':
        return 'image';
      case 'link':
        return 'link';
      default:
        return 'description';
    }
  };

  const getMemoryTitle = (memory: Memory) => {
    if (memory.title) return memory.title;
    if (memory.content) return memory.content.substring(0, 50) + (memory.content.length > 50 ? '...' : '');
    if (memory.url) return memory.url;
    return 'Untitled Memory';
  };

  const renderMemoryCard = (memory: Memory) => (
    <Card key={memory.id} style={styles.memoryCard}>
      <Card.Content>
        <View style={styles.memoryHeader}>
          <View style={styles.memoryTypeContainer}>
            <Icon 
              name={getMemoryIcon(memory.type)} 
              size={20} 
              color="#6200ee" 
              style={styles.memoryIcon}
            />
            <Text style={styles.memoryType}>{memory.type.toUpperCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            <Text style={styles.memoryDate}>{formatDate(memory.createdAt)}</Text>
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeleteMemory(memory.id)}
              iconColor="#f44336"
            />
          </View>
        </View>
        
        <Text style={styles.memoryTitle}>{getMemoryTitle(memory)}</Text>
        
        {memory.content && memory.title && (
          <Text style={styles.memoryContent} numberOfLines={3}>
            {memory.content}
          </Text>
        )}
        
        {memory.url && (
          <TouchableOpacity style={styles.linkContainer}>
            <Icon name="link" size={16} color="#6200ee" />
            <Text style={styles.linkText} numberOfLines={1}>
              {memory.url}
            </Text>
          </TouchableOpacity>
        )}
        
        {memory.description && (
          <Text style={styles.memoryDescription} numberOfLines={2}>
            {memory.description}
          </Text>
        )}

        {memory.analysis && (
          <View style={styles.analysisContainer}>
            <Icon name="auto-awesome" size={14} color="#ff6b35" />
            <Text style={styles.analysisText}>
              AI analyzed: {memory.storageMethod || 'processed'}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Card.Content style={styles.emptyContainer}>
        <Icon name="memory" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Memories Yet</Text>
        <Text style={styles.emptyText}>
          Start creating memories by adding text notes, photos, or links!
        </Text>
        <Button 
          mode="contained" 
          onPress={loadMemories}
          style={styles.retryButton}
          icon="refresh"
        >
          Refresh
        </Button>
      </Card.Content>
    </Card>
  );

  const renderFilterAndSort = () => (
    <Card style={styles.controlsCard}>
      <Card.Content>
        <View style={styles.controlsContainer}>
          <View style={styles.filtersContainer}>
            <Text style={styles.controlLabel}>Filter:</Text>
            <View style={styles.filterChips}>
              {(['all', 'text', 'image', 'link'] as FilterType[]).map((type) => (
                <Chip
                  key={type}
                  selected={filterType === type}
                  onPress={() => setFilterType(type)}
                  style={styles.filterChip}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.sortContainer}>
            <Text style={styles.controlLabel}>Sort:</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  icon="sort"
                  style={styles.sortButton}
                >
                  {sortBy} ({sortOrder})
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setSortBy('date');
                  setSortOrder('desc');
                  setMenuVisible(false);
                }}
                title="Date (newest first)"
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('date');
                  setSortOrder('asc');
                  setMenuVisible(false);
                }}
                title="Date (oldest first)"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setSortBy('type');
                  setSortOrder('asc');
                  setMenuVisible(false);
                }}
                title="Type (A-Z)"
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('title');
                  setSortOrder('asc');
                  setMenuVisible(false);
                }}
                title="Title (A-Z)"
              />
            </Menu>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Showing {filteredMemories.length} of {memories.length} memories
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading memories...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={styles.title}>All Memories</Text>
      
      {memories.length > 0 && renderFilterAndSort()}

      {filteredMemories.length === 0 ? (
        memories.length === 0 ? (
          renderEmptyState()
        ) : (
          <Card style={styles.noResultsCard}>
            <Card.Content style={styles.noResultsContainer}>
              <Icon name="filter-list-off" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>
                No memories match your current filter.
              </Text>
              <Button
                mode="outlined"
                onPress={() => setFilterType('all')}
                style={styles.clearFilterButton}
              >
                Clear Filter
              </Button>
            </Card.Content>
          </Card>
        )
      ) : (
        <View style={styles.memoriesContainer}>
          {filteredMemories.map(renderMemoryCard)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  controlsCard: {
    marginBottom: 16,
  },
  controlsContainer: {
    marginBottom: 8,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  sortContainer: {
    marginBottom: 8,
  },
  sortButton: {
    alignSelf: 'flex-start',
  },
  statsContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  memoriesContainer: {
    marginTop: 8,
  },
  memoryCard: {
    marginBottom: 12,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoryIcon: {
    marginRight: 6,
  },
  memoryType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoryDate: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  memoryContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    marginBottom: 8,
  },
  memoryDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#6200ee',
    marginLeft: 4,
    flex: 1,
  },
  analysisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  analysisText: {
    fontSize: 12,
    color: '#ff6b35',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 8,
  },
  noResultsCard: {
    marginTop: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  clearFilterButton: {
    marginTop: 8,
  },
});

export default MemoryListScreen; 
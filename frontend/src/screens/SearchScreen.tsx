import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService, Memory, SearchResult } from '../services/api';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      const results = await apiService.searchMemories(searchQuery.trim());
      setSearchResults(results);
      
      // Add to recent searches
      const updatedRecent = [searchQuery.trim(), ...recentSearches.filter(q => q !== searchQuery.trim())].slice(0, 5);
      setRecentSearches(updatedRecent);
      
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search memories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearchWithQuery(query);
  };

  const handleSearchWithQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await apiService.searchMemories(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search memories');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setSearchResults(null);
    setSearchQuery('');
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

  const renderMemoryCard = (memory: Memory, index: number) => (
    <Card key={memory.id || index} style={styles.memoryCard}>
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
          <Text style={styles.memoryDate}>{formatDate(memory.createdAt)}</Text>
        </View>
        
        {memory.title && (
          <Text style={styles.memoryTitle}>{memory.title}</Text>
        )}
        
        {memory.content && (
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
      </Card.Content>
    </Card>
  );

  const renderAIInsights = () => {
    if (!searchResults?.aiInsights) return null;

    return (
      <Card style={styles.insightsCard}>
        <Card.Content>
          <View style={styles.insightsHeader}>
            <Icon name="auto-awesome" size={20} color="#ff6b35" />
            <Text style={styles.insightsTitle}>AI Insights</Text>
          </View>
          
          {searchResults.aiInsights.search_insights && (
            <Text style={styles.insightsText}>
              {searchResults.aiInsights.search_insights}
            </Text>
          )}
          
          {searchResults.aiInsights.content_summary && (
            <>
              <Text style={styles.insightsSubtitle}>Summary:</Text>
              <Text style={styles.insightsText}>
                {searchResults.aiInsights.content_summary}
              </Text>
            </>
          )}
          
          {searchResults.aiInsights.suggested_filters && searchResults.aiInsights.suggested_filters.length > 0 && (
            <>
              <Text style={styles.insightsSubtitle}>Suggested filters:</Text>
              <View style={styles.filtersContainer}>
                {searchResults.aiInsights.suggested_filters.map((filter: string, index: number) => (
                  <Chip
                    key={index}
                    style={styles.filterChip}
                    onPress={() => handleSearchWithQuery(filter)}
                  >
                    {filter}
                  </Chip>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.searchCard}>
        <Card.Content>
          <Text style={styles.title}>Search Memories</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              label="Search your memories..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              mode="outlined"
              placeholder="e.g., 'vacation photos', 'meeting notes', 'funny videos'"
              right={
                <TextInput.Icon
                  icon={searchQuery ? "close" : "search"}
                  onPress={searchQuery ? clearResults : handleSearch}
                />
              }
              onSubmitEditing={handleSearch}
            />
            
            <Button
              mode="contained"
              onPress={handleSearch}
              style={styles.searchButton}
              disabled={isLoading}
              icon="search"
            >
              Search
            </Button>
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !searchResults && (
            <View style={styles.recentContainer}>
              <Text style={styles.recentTitle}>Recent Searches</Text>
              <View style={styles.recentChips}>
                {recentSearches.map((query, index) => (
                  <Chip
                    key={index}
                    style={styles.recentChip}
                    onPress={() => handleRecentSearch(query)}
                    icon="history"
                  >
                    {query}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Searching memories...</Text>
        </View>
      )}

      {/* Search Results */}
      {searchResults && !isLoading && (
        <View style={styles.resultsContainer}>
          <Card style={styles.resultsHeader}>
            <Card.Content>
              <View style={styles.resultsHeaderContent}>
                <Text style={styles.resultsTitle}>
                  Search Results for "{searchResults.query}"
                </Text>
                <Text style={styles.resultsCount}>
                  {searchResults.results.length} result(s) found
                </Text>
                <Text style={styles.searchMethod}>
                  Using {searchResults.searchMethod} search
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={clearResults}
                style={styles.clearButton}
                icon="clear"
              >
                Clear
              </Button>
            </Card.Content>
          </Card>

          {/* AI Insights */}
          {renderAIInsights()}

          {/* Results */}
          {searchResults.results.length === 0 ? (
            <Card style={styles.noResultsCard}>
              <Card.Content style={styles.noResultsContainer}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>
                  No memories found matching your search.
                </Text>
                <Text style={styles.noResultsSubtext}>
                  Try using different keywords or add more memories!
                </Text>
              </Card.Content>
            </Card>
          ) : (
            searchResults.results.map((memory, index) => renderMemoryCard(memory, index))
          )}
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
  searchCard: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 12,
  },
  searchButton: {
    paddingVertical: 8,
  },
  recentContainer: {
    marginTop: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsHeaderContent: {
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  searchMethod: {
    fontSize: 12,
    color: '#999',
  },
  clearButton: {
    alignSelf: 'flex-start',
  },
  insightsCard: {
    marginBottom: 16,
    backgroundColor: '#fff8f0',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#ff6b35',
  },
  insightsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
  },
  insightsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
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
  memoryDate: {
    fontSize: 12,
    color: '#999',
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
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SearchScreen; 
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Searchbar,
  Text,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../services/ApiService';
import VoiceSearch from '../components/VoiceSearch';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchInsights, setSearchInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await ApiService.searchMemories(searchQuery.trim());
      if (response.success) {
        setSearchResults(response.results || []);
        setSearchInsights(response.insights || null);
      } else {
        Alert.alert('Error', 'Failed to search memories');
        setSearchResults([]);
        setSearchInsights(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to search memories');
      setSearchResults([]);
      setSearchInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceResult = (text) => {
    setSearchQuery(text);
    performSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchInsights(null);
    setHasSearched(false);
  };

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

  const getSimilarityColor = (similarity) => {
    if (similarity > 0.8) return '#4CAF50'; // High similarity - Green
    if (similarity > 0.6) return '#FF9800'; // Medium similarity - Orange
    return '#F44336'; // Low similarity - Red
  };

  const renderSearchInsights = () => {
    if (!searchInsights) return null;

    return (
      <Card style={styles.insightsCard}>
        <Card.Content>
          <View style={styles.insightsHeader}>
            <Icon name="psychology" size={24} color="#6200EE" />
            <Title style={styles.insightsTitle}>AI Insights</Title>
          </View>
          
          {searchInsights.search_insights && (
            <View style={styles.insightSection}>
              <Text style={styles.insightLabel}>Analysis:</Text>
              <Paragraph style={styles.insightText}>{searchInsights.search_insights}</Paragraph>
            </View>
          )}

          {searchInsights.content_summary && (
            <View style={styles.insightSection}>
              <Text style={styles.insightLabel}>Summary:</Text>
              <Paragraph style={styles.insightText}>{searchInsights.content_summary}</Paragraph>
            </View>
          )}

          {searchInsights.suggested_filters && searchInsights.suggested_filters.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightLabel}>Suggested Filters:</Text>
              <View style={styles.chipsContainer}>
                {searchInsights.suggested_filters.map((filter, index) => (
                  <Chip 
                    key={index} 
                    style={styles.filterChip}
                    onPress={() => setSearchQuery(filter)}>
                    {filter}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {searchInsights.related_queries && searchInsights.related_queries.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightLabel}>Related Searches:</Text>
              <View style={styles.chipsContainer}>
                {searchInsights.related_queries.map((query, index) => (
                  <Chip 
                    key={index} 
                    style={styles.relatedChip}
                    onPress={() => setSearchQuery(query)}>
                    {query}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderSearchResult = ({ item }) => (
    <Card
      style={styles.resultCard}
      onPress={() => navigation.navigate('MemoryDetail', { memory: item })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.typeInfo}>
            <Icon
              name={getMemoryIcon(item.type)}
              size={20}
              color={getMemoryColor(item.type)}
            />
            <Chip
              icon={() => <Icon name={getMemoryIcon(item.type)} size={14} color="white" />}
              mode="flat"
              style={[styles.typeChip, { backgroundColor: getMemoryColor(item.type) }]}
              textStyle={{ color: 'white', fontSize: 10 }}>
              {item.type.toUpperCase()}
            </Chip>
          </View>
          {item.similarity && (
            <Chip
              style={[styles.similarityChip, { backgroundColor: getSimilarityColor(item.similarity) }]}
              textStyle={{ color: 'white', fontSize: 10 }}>
              {Math.round(item.similarity * 100)}% match
            </Chip>
          )}
        </View>
        
        <Title style={styles.resultTitle} numberOfLines={2}>
          {item.title || 'Untitled Memory'}
        </Title>
        
        <Paragraph numberOfLines={3} style={styles.resultDescription}>
          {item.content || item.description || 'No description available'}
        </Paragraph>
        
        {item.category && (
          <View style={styles.categoryContainer}>
            <Chip style={styles.categoryChip} textStyle={styles.categoryText}>
              {item.category}
            </Chip>
            {item.importance && (
              <View style={styles.importanceContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.importanceText}>{item.importance}/10</Text>
              </View>
            )}
          </View>
        )}
        
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </Card.Content>
    </Card>
  );

  const SearchSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Title style={styles.suggestionsTitle}>Try searching for:</Title>
      <View style={styles.suggestionChips}>
        {[
          "photos from last week",
          "notes about work",
          "links about technology",
          "memories with friends",
          "important documents",
          "vacation photos",
          "high importance items",
          "recent activities",
          "study materials"
        ].map((suggestion, index) => (
          <Chip
            key={index}
            style={styles.suggestionChip}
            onPress={() => setSearchQuery(suggestion)}>
            {suggestion}
          </Chip>
        ))}
      </View>
    </View>
  );

  const EmptyResults = () => (
    <View style={styles.emptyResults}>
      <Icon name="search-off" size={64} color="#C4C4C4" />
      <Title style={styles.emptyTitle}>No matches found</Title>
      <Paragraph style={styles.emptyText}>
        Try using different keywords or check your spelling.
      </Paragraph>
      <Button
        mode="outlined"
        onPress={clearSearch}
        style={styles.clearButton}>
        Clear Search
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Searchbar
            placeholder="Search your memories with natural language..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={performSearch}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
          />
          <VoiceSearch
            onVoiceResult={handleVoiceResult}
            style={styles.voiceSearch}
          />
        </View>
        <View style={styles.searchActions}>
          <Button
            mode="contained"
            onPress={performSearch}
            loading={loading}
            disabled={loading || !searchQuery.trim()}
            style={styles.searchButton}>
            Search
          </Button>
          {hasSearched && (
            <Button
              mode="outlined"
              onPress={clearSearch}
              style={styles.clearButton}>
              Clear
            </Button>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Searching with AI...</Text>
          <Text style={styles.loadingSubtext}>Analyzing semantic meaning...</Text>
        </View>
      ) : hasSearched ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : styles.resultsContainer}
          ListEmptyComponent={EmptyResults}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {searchResults.length > 0 && (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount}>
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </Text>
                </View>
              )}
              {renderSearchInsights()}
            </>
          }
        />
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <SearchSuggestions />
          
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <Icon name="auto-awesome" size={24} color="#6200EE" />
                <Title style={styles.infoTitle}>AI-Powered Search</Title>
              </View>
              <Paragraph style={styles.infoText}>
                This app uses advanced vector embeddings and RAG (Retrieval Augmented Generation) 
                to understand the semantic meaning of your queries and provide intelligent search results.
              </Paragraph>
              <Divider style={styles.divider} />
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Icon name="psychology" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Semantic Understanding</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="insights" size={20} color="#FF9800" />
                  <Text style={styles.featureText}>Smart Insights</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="analytics" size={20} color="#2196F3" />
                  <Text style={styles.featureText}>Vector Database</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#F0F0F0',
  },
  searchInput: {
    fontSize: 16,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#6200EE',
  },
  clearButton: {
    borderColor: '#6200EE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#888',
  },
  resultsContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  insightsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
    backgroundColor: '#F8F5FF',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsTitle: {
    marginLeft: 8,
    fontSize: 18,
    color: '#6200EE',
  },
  insightSection: {
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E8F5E8',
  },
  relatedChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E3F2FD',
  },
  resultCard: {
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
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeChip: {
    height: 20,
    marginLeft: 8,
  },
  similarityChip: {
    height: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  resultDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#FCE4EC',
    height: 20,
  },
  categoryText: {
    fontSize: 10,
    color: '#C2185B',
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importanceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  suggestionsContainer: {
    padding: 20,
  },
  suggestionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E8F5E8',
  },
  infoCard: {
    margin: 16,
    elevation: 4,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 18,
    color: '#6200EE',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  divider: {
    marginVertical: 16,
  },
  featuresList: {
    flexDirection: 'column',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  emptyResults: {
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
  scrollView: {
    flex: 1,
  },
  voiceSearch: {
    marginLeft: 8,
  },
}); 
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Chip,
  Divider,
  Dialog,
  Portal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../services/ApiService';

export default function MemoryDetailScreen({ route, navigation }) {
  const { memory } = route.params;
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await ApiService.deleteMemory(memory.id);
      if (response.success) {
        Alert.alert('Success', 'Memory deleted successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to delete memory');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete memory');
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
    }
  };

  const openLink = async () => {
    if (memory.url) {
      const supported = await Linking.canOpenURL(memory.url);
      if (supported) {
        await Linking.openURL(memory.url);
      } else {
        Alert.alert("Error", "Unable to open this link");
      }
    }
  };

  const renderMetadataSection = () => {
    if (!memory.metadata) return null;

    return (
      <Card style={styles.metadataCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>AI Analysis</Title>
          
          {memory.metadata.description && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Description:</Text>
              <Paragraph style={styles.metadataValue}>{memory.metadata.description}</Paragraph>
            </View>
          )}

          {memory.metadata.objects && memory.metadata.objects.length > 0 && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Objects detected:</Text>
              <View style={styles.chipsContainer}>
                {memory.metadata.objects.map((obj, index) => (
                  <Chip key={index} style={styles.objectChip} textStyle={styles.chipText}>
                    {obj}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {memory.metadata.scene && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Scene:</Text>
              <Paragraph style={styles.metadataValue}>{memory.metadata.scene}</Paragraph>
            </View>
          )}

          {memory.metadata.colors && memory.metadata.colors.length > 0 && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Colors:</Text>
              <View style={styles.chipsContainer}>
                {memory.metadata.colors.map((color, index) => (
                  <Chip key={index} style={styles.colorChip} textStyle={styles.chipText}>
                    {color}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {memory.metadata.mood && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Mood:</Text>
              <Chip style={styles.moodChip} textStyle={styles.chipText}>
                {memory.metadata.mood}
              </Chip>
            </View>
          )}

          {memory.metadata.keywords && memory.metadata.keywords.length > 0 && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Keywords:</Text>
              <View style={styles.chipsContainer}>
                {memory.metadata.keywords.map((keyword, index) => (
                  <Chip key={index} style={styles.keywordChip} textStyle={styles.chipText}>
                    {keyword}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {memory.metadata.tags && memory.metadata.tags.length > 0 && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Tags:</Text>
              <View style={styles.chipsContainer}>
                {memory.metadata.tags.map((tag, index) => (
                  <Chip key={index} style={styles.tagChip} textStyle={styles.chipText}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {memory.metadata.importance_level && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Importance Level:</Text>
              <View style={styles.importanceContainer}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <Icon
                    key={level}
                    name="star"
                    size={20}
                    color={level <= memory.metadata.importance_level ? '#FFD700' : '#E0E0E0'}
                  />
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerTop}>
              <View style={styles.typeInfo}>
                <Icon
                  name={getMemoryIcon(memory.type)}
                  size={32}
                  color={getMemoryColor(memory.type)}
                />
                <Chip
                  icon={() => <Icon name={getMemoryIcon(memory.type)} size={16} color="white" />}
                  mode="flat"
                  style={[styles.typeChip, { backgroundColor: getMemoryColor(memory.type) }]}
                  textStyle={{ color: 'white', fontSize: 12 }}>
                  {memory.type.toUpperCase()}
                </Chip>
              </View>
              <Text style={styles.dateText}>{formatDate(memory.createdAt)}</Text>
            </View>
            
            <Title style={styles.memoryTitle}>
              {memory.title || memory.metadata?.title || 'Untitled Memory'}
            </Title>
          </Card.Content>
        </Card>

        {/* Content Card */}
        <Card style={styles.contentCard}>
          <Card.Content>
            {memory.type === 'image' && memory.fileName && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: `http://10.0.2.2:3000/uploads/${memory.fileName}` }}
                  style={styles.memoryImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {memory.type === 'text' && memory.content && (
              <View style={styles.textContainer}>
                <Title style={styles.sectionTitle}>Content</Title>
                <Paragraph style={styles.textContent}>{memory.content}</Paragraph>
              </View>
            )}

            {memory.type === 'link' && (
              <View style={styles.linkContainer}>
                <Title style={styles.sectionTitle}>Link Details</Title>
                <View style={styles.linkInfo}>
                  <Icon name="link" size={24} color="#FF9800" />
                  <View style={styles.linkText}>
                    <Text style={styles.linkUrl} numberOfLines={2}>{memory.url}</Text>
                    {memory.description && (
                      <Paragraph style={styles.linkDescription}>{memory.description}</Paragraph>
                    )}
                  </View>
                </View>
                <Button
                  mode="contained"
                  icon="open-in-new"
                  onPress={openLink}
                  style={styles.openLinkButton}>
                  Open Link
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Metadata Section */}
        {renderMetadataSection()}

        {/* Actions Card */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Actions</Title>
            <View style={styles.actionsContainer}>
              <Button
                mode="outlined"
                icon="delete"
                onPress={() => setDeleteDialogVisible(true)}
                style={styles.deleteButton}
                labelStyle={styles.deleteButtonText}>
                Delete Memory
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Memory</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to delete this memory? This action cannot be undone.</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} loading={deleting} disabled={deleting}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
    borderRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeChip: {
    marginLeft: 12,
    height: 28,
  },
  memoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    lineHeight: 32,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  contentCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 4,
    borderRadius: 12,
  },
  imageContainer: {
    alignItems: 'center',
  },
  memoryImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  textContainer: {
    paddingVertical: 8,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  linkContainer: {
    paddingVertical: 8,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  linkText: {
    marginLeft: 12,
    flex: 1,
  },
  linkUrl: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  openLinkButton: {
    backgroundColor: '#FF9800',
  },
  metadataCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 4,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  metadataItem: {
    marginBottom: 16,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  objectChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E8F5E8',
  },
  colorChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF3E0',
  },
  moodChip: {
    backgroundColor: '#F3E5F5',
  },
  keywordChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E3F2FD',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FCE4EC',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    elevation: 4,
    borderRadius: 12,
  },
  actionsContainer: {
    alignItems: 'flex-start',
  },
  deleteButton: {
    borderColor: '#F44336',
  },
  deleteButtonText: {
    color: '#F44336',
  },
}); 
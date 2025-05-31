import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Dialog,
  Portal,
  Text,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { ApiService } from '../services/ApiService';

export default function AddMemoryScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState('');
  
  // Text memory state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  
  // Link memory state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  
  // Image memory state
  const [selectedImage, setSelectedImage] = useState(null);

  const showImagePicker = () => {
    setDialogType('image');
    setDialogVisible(true);
  };

  const showTextDialog = () => {
    setDialogType('text');
    setDialogVisible(true);
  };

  const showLinkDialog = () => {
    setDialogType('link');
    setDialogVisible(true);
  };

  const hideDialog = () => {
    setDialogVisible(false);
    setDialogType('');
    setTextTitle('');
    setTextContent('');
    setLinkUrl('');
    setLinkTitle('');
    setLinkDescription('');
    setSelectedImage(null);
  };

  const selectImageFromLibrary = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
    }, (response) => {
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
      }
    });
    hideDialog();
  };

  const takePhoto = () => {
    launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
    }, (response) => {
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
      }
    });
    hideDialog();
  };

  const addImageMemory = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.addImageMemory(
        selectedImage.uri,
        selectedImage.fileName
      );
      
      if (response.success) {
        Alert.alert('Success', 'Image memory added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to add image memory');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTextMemory = async () => {
    if (!textContent.trim()) {
      Alert.alert('Error', 'Please enter some text content');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.addTextMemory(
        textContent.trim(),
        textTitle.trim() || undefined
      );
      
      if (response.success) {
        Alert.alert('Success', 'Text memory added successfully!', [
          { text: 'OK', onPress: () => {
            hideDialog();
            navigation.goBack();
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to add text memory');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addLinkMemory = async () => {
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    try {
      const response = await ApiService.addLinkMemory(
        finalUrl,
        linkTitle.trim() || undefined,
        linkDescription.trim() || undefined
      );
      
      if (response.success) {
        Alert.alert('Success', 'Link memory added successfully!', [
          { text: 'OK', onPress: () => {
            hideDialog();
            navigation.goBack();
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to add link memory');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const MemoryTypeCard = ({ title, description, icon, color, onPress }) => (
    <Card style={[styles.typeCard, { borderLeftColor: color }]} onPress={onPress}>
      <Card.Content style={styles.typeCardContent}>
        <View style={styles.typeCardHeader}>
          <Icon name={icon} size={32} color={color} />
          <View style={styles.typeCardText}>
            <Title style={styles.typeTitle}>{title}</Title>
            <Paragraph style={styles.typeDescription}>{description}</Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Add New Memory</Title>
          <Paragraph style={styles.headerSubtitle}>
            Choose how you'd like to capture this moment
          </Paragraph>
        </View>

        <View style={styles.typeContainer}>
          <MemoryTypeCard
            title="Take Photo"
            description="Capture a moment with your camera or choose from gallery"
            icon="camera-alt"
            color="#4CAF50"
            onPress={showImagePicker}
          />

          <MemoryTypeCard
            title="Text Note"
            description="Write down your thoughts, ideas, or important information"
            icon="text-fields"
            color="#2196F3"
            onPress={showTextDialog}
          />

          <MemoryTypeCard
            title="Save Link"
            description="Save interesting web pages, videos, or articles"
            icon="link"
            color="#FF9800"
            onPress={showLinkDialog}
          />
        </View>

        {selectedImage && (
          <Card style={styles.previewCard}>
            <Card.Content>
              <Title style={styles.previewTitle}>Selected Image</Title>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <Button
                  mode="outlined"
                  onPress={() => setSelectedImage(null)}
                  style={styles.previewButton}>
                  Remove
                </Button>
                <Button
                  mode="contained"
                  onPress={addImageMemory}
                  loading={loading}
                  disabled={loading}
                  style={styles.previewButton}>
                  Add Memory
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible && dialogType === 'image'} onDismiss={hideDialog}>
          <Dialog.Title>Add Image Memory</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Choose how to add your image:</Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button onPress={takePhoto} icon="camera">Take Photo</Button>
            <Button onPress={selectImageFromLibrary} icon="image">From Gallery</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialogVisible && dialogType === 'text'} onDismiss={hideDialog}>
          <Dialog.Title>Add Text Memory</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title (optional)"
              value={textTitle}
              onChangeText={setTextTitle}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Content"
              value={textContent}
              onChangeText={setTextContent}
              multiline
              numberOfLines={4}
              style={styles.dialogInput}
              mode="outlined"
              placeholder="Write your thoughts, ideas, or notes here..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button
              onPress={addTextMemory}
              loading={loading}
              disabled={loading || !textContent.trim()}>
              Add Memory
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialogVisible && dialogType === 'link'} onDismiss={hideDialog}>
          <Dialog.Title>Add Link Memory</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="URL"
              value={linkUrl}
              onChangeText={setLinkUrl}
              style={styles.dialogInput}
              mode="outlined"
              placeholder="https://example.com"
              autoCapitalize="none"
              keyboardType="url"
            />
            <TextInput
              label="Title (optional)"
              value={linkTitle}
              onChangeText={setLinkTitle}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Description (optional)"
              value={linkDescription}
              onChangeText={setLinkDescription}
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button
              onPress={addLinkMemory}
              loading={loading}
              disabled={loading || !linkUrl.trim()}>
              Add Memory
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
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  typeContainer: {
    paddingHorizontal: 16,
  },
  typeCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  typeCardContent: {
    paddingVertical: 20,
  },
  typeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeCardText: {
    marginLeft: 16,
    flex: 1,
  },
  typeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  previewCard: {
    margin: 16,
    elevation: 4,
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A1A1A',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  previewButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  dialogInput: {
    marginBottom: 16,
  },
}); 
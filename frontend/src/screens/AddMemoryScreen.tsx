import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
} from 'react-native';
import {
  Button,
  Card,
  TextInput,
  Chip,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';

const AddMemoryScreen = () => {
  const [memoryType, setMemoryType] = useState<'text' | 'image' | 'link'>('text');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const resetForm = () => {
    setTextContent('');
    setTextTitle('');
    setLinkUrl('');
    setLinkTitle('');
    setLinkDescription('');
  };

  const handleAddTextMemory = async () => {
    if (!textContent.trim()) {
      Alert.alert('Error', 'Please enter some text content');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.addTextMemory(textContent, textTitle);
      showMessage('Text memory added successfully!');
      resetForm();
    } catch (error) {
      console.error('Error adding text memory:', error);
      Alert.alert('Error', 'Failed to add text memory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      },
      handleImageResponse
    );
  };

  const openGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      },
      handleImageResponse
    );
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const imageUri = response.assets[0].uri;
      if (!imageUri) return;

      setIsLoading(true);
      try {
        await apiService.addImageMemory(imageUri);
        showMessage('Image memory added successfully!');
      } catch (error) {
        console.error('Error adding image memory:', error);
        Alert.alert('Error', 'Failed to add image memory');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddLinkMemory = async () => {
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.addLinkMemory(linkUrl, linkTitle, linkDescription);
      showMessage('Link memory added successfully!');
      resetForm();
    } catch (error) {
      console.error('Error adding link memory:', error);
      Alert.alert('Error', 'Failed to add link memory');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTextForm = () => (
    <View style={styles.formContainer}>
      <TextInput
        label="Title (optional)"
        value={textTitle}
        onChangeText={setTextTitle}
        style={styles.input}
        mode="outlined"
      />
      <TextInput
        label="Content"
        value={textContent}
        onChangeText={setTextContent}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
        placeholder="Enter your thoughts, notes, or ideas..."
      />
      <Button
        mode="contained"
        onPress={handleAddTextMemory}
        style={styles.button}
        disabled={isLoading}
        icon="note-add"
      >
        Add Text Memory
      </Button>
    </View>
  );

  const renderImageForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.description}>
        Take a photo or select from your gallery to create a visual memory
      </Text>
      <Button
        mode="contained"
        onPress={handleImagePicker}
        style={styles.button}
        disabled={isLoading}
        icon="camera-alt"
      >
        Add Image/Photo
      </Button>
    </View>
  );

  const renderLinkForm = () => (
    <View style={styles.formContainer}>
      <TextInput
        label="URL"
        value={linkUrl}
        onChangeText={setLinkUrl}
        style={styles.input}
        mode="outlined"
        placeholder="https://example.com"
        keyboardType="url"
      />
      <TextInput
        label="Title (optional)"
        value={linkTitle}
        onChangeText={setLinkTitle}
        style={styles.input}
        mode="outlined"
      />
      <TextInput
        label="Description (optional)"
        value={linkDescription}
        onChangeText={setLinkDescription}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={3}
        placeholder="Add a description for this link..."
      />
      <Button
        mode="contained"
        onPress={handleAddLinkMemory}
        style={styles.button}
        disabled={isLoading}
        icon="link"
      >
        Add Link Memory
      </Button>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Add New Memory</Text>
          
          {/* Memory Type Selector */}
          <View style={styles.chipContainer}>
            <Chip
              selected={memoryType === 'text'}
              onPress={() => setMemoryType('text')}
              style={styles.chip}
              icon="text-snippet"
            >
              Text
            </Chip>
            <Chip
              selected={memoryType === 'image'}
              onPress={() => setMemoryType('image')}
              style={styles.chip}
              icon="image"
            >
              Image
            </Chip>
            <Chip
              selected={memoryType === 'link'}
              onPress={() => setMemoryType('link')}
              style={styles.chip}
              icon="link"
            >
              Link
            </Chip>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Processing memory...</Text>
            </View>
          )}

          {/* Form based on selected type */}
          {!isLoading && (
            <>
              {memoryType === 'text' && renderTextForm()}
              {memoryType === 'image' && renderImageForm()}
              {memoryType === 'link' && renderLinkForm()}
            </>
          )}
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  chip: {
    flex: 1,
    marginHorizontal: 4,
  },
  formContainer: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
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
});

export default AddMemoryScreen; 
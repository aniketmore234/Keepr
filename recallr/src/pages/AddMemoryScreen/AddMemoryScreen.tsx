import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { memoryApi } from '../../services/api';
import { useNavigation, CommonActions } from '@react-navigation/native';
import SharingDebug from '../../components/SharingDebug';

const AddMemoryScreen = () => {
  const [activeTab, setActiveTab] = useState<'Text' | 'Photo' | 'Link'>('Text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const handleGoBack = () => {
    navigation.dispatch(CommonActions.goBack());
  };

  const handleImagePicker = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]?.uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Validation
      if (activeTab === 'Text' && !content.trim()) {
        Alert.alert('Error', 'Please enter some text content');
        return;
      }
      
      if (activeTab === 'Photo' && !selectedImage) {
        Alert.alert('Error', 'Please select an image');
        return;
      }
      
      if (activeTab === 'Link' && !content.trim()) {
        Alert.alert('Error', 'Please enter a valid URL');
        return;
      }

      const memory = {
        title: title.trim(),
        content: content.trim(),
        type: activeTab.toLowerCase() as 'text' | 'photo' | 'link',
        imageUrl: selectedImage || undefined,
      };

      console.log('Saving memory:', memory);
      
      await memoryApi.createMemory(memory);
      Alert.alert(
        'Success',
        'Memory saved successfully!',
        [{ text: 'OK', onPress: handleGoBack }]
      );
    } catch (error) {
      console.error('Error saving memory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save memory. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Photo':
        return (
          <View style={styles.photoContainer}>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={handleImagePicker}
                >
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleImagePicker}
              >
                <Text style={styles.uploadButtonText}>Upload Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case 'Text':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What would you like to remember?"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        );
      case 'Link':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter URL..."
              value={content}
              onChangeText={setContent}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Temporary Debug Component */}
      <SharingDebug />
      
      {/* Tabs */}
      <View style={styles.tabs}>
        {['Text', 'Photo', 'Link'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Title (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Give your memory a title..."
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {renderContent()}

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Save Memory</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6750A4',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#AAA',
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: 'white',
  },
  tabButtonActive: {
    backgroundColor: '#6750A4',
    borderColor: '#6750A4',
  },
  tabText: {
    textAlign: 'center',
    color: '#AAA',
    fontWeight: '600',
  },
  tabTextActive: {
    color: 'white',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#4E4B66',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    height: 100,
  },
  saveButton: {
    backgroundColor: '#6750A4',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  photoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#6750A4',
    paddingVertical: 40,
    paddingHorizontal: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5B4593',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  changePhotoButton: {
    backgroundColor: '#5B4593',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  changePhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddMemoryScreen;

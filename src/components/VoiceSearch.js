import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import Voice from '@react-native-voice/voice';

const VoiceSearch = ({ onVoiceResult, style }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize voice recognition
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      // Cleanup
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => {
    setError('');
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (event) => {
    if (event.value && event.value[0]) {
      onVoiceResult(event.value[0]);
    }
  };

  const onSpeechError = (error) => {
    setError(error.error?.message || 'Error occurred during voice recognition');
    setIsListening(false);
  };

  const startVoiceRecognition = async () => {
    try {
      setError('');
      setIsListening(true);
      await Voice.start('en-US');
    } catch (error) {
      setError('Error starting voice recognition');
      setIsListening(false);
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      setError('Error stopping voice recognition');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
        style={styles.button}
      >
        <IconButton
          icon={isListening ? 'microphone' : 'microphone-outline'}
          size={24}
          color={isListening ? '#6200EE' : '#666'}
        />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    padding: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default VoiceSearch; 
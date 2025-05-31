import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import Voice from '@react-native-voice/voice';

const VoiceInput = ({ onVoiceResult, style }) => {
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
        style={[
          styles.button,
          isListening && styles.buttonActive
        ]}
      >
        {isListening ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonIcon}>🎤</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6750A4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  errorText: {
    color: '#B71C1C',
    fontSize: 12,
    marginTop: 4,
    position: 'absolute',
    bottom: -20,
    width: 200,
    textAlign: 'center',
  },
});

export default VoiceInput; 
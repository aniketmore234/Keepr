import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Dimensions,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { SvgXml } from 'react-native-svg';
import { chatbotApi } from '../../services/api';

const micIconXml = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/>
  <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="currentColor"/>
</svg>`;

// Base path for uploaded images
const UPLOADS_BASE_PATH = Platform.select({
  ios: 'http://localhost:3000/uploads',
  android: 'http://10.0.2.2:3000/uploads',
  default: 'http://localhost:3000/uploads',
});

const getImagePath = (fileName: string) => {
  if (!fileName) {
    console.log('[Image Path Debug] No fileName provided');
    return null;
  }

  console.log(`[Image Path Debug] Processing fileName: ${fileName}`);
  console.log(`[Image Path Debug] Using base path: ${UPLOADS_BASE_PATH}`);
  
  // Construct the full URL
  const fullPath = `${UPLOADS_BASE_PATH}/${fileName}`;
  console.log(`[Image Path Debug] Full path: ${fullPath}`);
  
  return fullPath;
};

type Message = {
  id: string;
  text: string;
  fromUser: boolean;
  error?: boolean;
  confidence?: string;
  sources?: string[];
  relevantMemories?: Array<{
    title?: string;
    createdAt: string;
    content?: string;
    type: string;
    imagePath: string | null;
    description?: string;
  }>;
};

// initial message for the chatbot
const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hello! I'm your memory assistant. I can help you explore and understand your memories. What would you like to discuss?",
    fromUser: false,
  },
];


const MemoryChatbotScreen = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceInitialized, setVoiceInitialized] = useState(false);
  const appState = useRef(AppState.currentState);
  const isScreenActive = useRef(true);
  const isMounted = useRef(true);

  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice event handlers
  const voiceStart = (e: SpeechStartEvent) => {
    console.log('[Voice] Started recording');
    // Always update UI state and ensure screen is marked as active
    isScreenActive.current = true;
    if (isMounted.current) {
      setIsRecording(true);
    }
  };

  const voiceEnd = (e: SpeechEndEvent) => {
    console.log('[Voice] Stopped recording');
    if (isMounted.current) {
      setIsRecording(false);
    }
  };

  const voiceResults = (e: SpeechResultsEvent) => {
    const spokenText = e.value?.[0] || '';
    console.log('[Voice] Results:', spokenText);
    console.log('[Voice] isScreenActive:', isScreenActive.current, 'isMounted:', isMounted.current);
    
    // Always set input text if we have spoken text and component is mounted
    // Since voice recognition is working (search works), we should always show the text
    if (spokenText && isMounted.current) {
      console.log('[Voice] Setting input text to:', spokenText);
      isScreenActive.current = true; // Ensure screen is marked as active
      setInputText(spokenText);
    }
  };

  const voiceError = (e: SpeechErrorEvent) => {
    console.error('[Voice] Error:', e);
    if (isMounted.current) {
      setIsRecording(false);
    }
  };

  // Initialize voice recognition
  const initializeVoice = () => {
    console.log('[Voice] Initializing voice recognition...');
    
    // Remove existing listeners first
    Voice.removeAllListeners();
    
    // Set up event listeners
    Voice.onSpeechStart = voiceStart;
    Voice.onSpeechEnd = voiceEnd;
    Voice.onSpeechResults = voiceResults;
    Voice.onSpeechError = voiceError;

    // Check if voice is available
    Voice.isAvailable()
      .then(() => {
        console.log('[Voice] Voice recognition is available');
        if (isMounted.current) {
          setVoiceInitialized(true);
        }
      })
      .catch((error) => {
        console.error('[Voice] Initialization error:', error);
        if (isMounted.current) {
          setVoiceInitialized(false);
        }
      });
  };

  // Clean up voice recognition
  const cleanupVoice = () => {
    console.log('[Voice] Cleaning up voice recognition...');
    Voice.stop()
      .then(() => Voice.destroy())
      .then(() => {
        Voice.removeAllListeners();
        if (isMounted.current) {
          setIsRecording(false);
          setVoiceInitialized(false);
        }
      })
      .catch((error) => {
        console.error('[Voice] Cleanup error:', error);
        if (isMounted.current) {
          setIsRecording(false);
          setVoiceInitialized(false);
        }
      });
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('[Voice] App state changed from', appState.current, 'to', nextAppState);
    
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('[Voice] App became active, reinitializing voice...');
      isScreenActive.current = true;
      setTimeout(() => {
        if (isMounted.current) {
          initializeVoice();
        }
      }, 500); // Small delay to ensure app is fully active
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background
      console.log('[Voice] App going to background, stopping recording...');
      isScreenActive.current = false;
      setIsRecording(false);
      Voice.stop().catch(console.error);
    }
    
    appState.current = nextAppState;
  };

  // Initialize voice recognition on component mount
  useEffect(() => {
    console.log('[Voice] Component mounted, initializing...');
    isMounted.current = true;
    isScreenActive.current = true;
    
    initializeVoice();

    // Add app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('[Voice] Component unmounting, cleaning up...');
      isMounted.current = false;
      subscription?.remove();
      cleanupVoice();
    };
  }, []);

  // Add effect to handle screen focus - this ensures voice is ready when user interacts
  useEffect(() => {
    const resetVoiceOnFocus = () => {
      console.log('[Voice] Screen focused, ensuring voice is ready...');
      isScreenActive.current = true;
      
      // Force reinitialization if needed
      if (!voiceInitialized) {
        initializeVoice();
      }
    };

    // Call immediately when component mounts/becomes visible
    resetVoiceOnFocus();

  }, []); // Run once on mount

  const startRecording = () => {
    console.log('[Voice] Attempting to start recording...');
    console.log('[Voice] Current state - isScreenActive:', isScreenActive.current, 'voiceInitialized:', voiceInitialized, 'isMounted:', isMounted.current);
    
    // Always ensure screen is active
    isScreenActive.current = true;
    
    const performStartRecording = () => {
      // Stop any existing recording first
      Voice.stop()
        .then(() => {
          // Start new recording
          return Voice.start('en-US');
        })
        .then(() => {
          console.log('[Voice] Recording started successfully');
        })
        .catch((error) => {
          console.error('[Voice] Start error:', error);
          if (isMounted.current) {
            setIsRecording(false);
          }
          
          // Try to reinitialize on error
          console.log('[Voice] Attempting to reinitialize after error...');
          cleanupVoice();
          setTimeout(() => {
            if (isMounted.current) {
              initializeVoice();
            }
          }, 1000);
        });
    };

    // Only reinitialize if voice is not initialized, otherwise try to start directly
    if (!voiceInitialized) {
      console.log('[Voice] Voice not initialized, initializing first...');
      initializeVoice();
      setTimeout(performStartRecording, 1000);
    } else {
      console.log('[Voice] Voice already initialized, starting recording directly...');
      performStartRecording();
    }
  };

  const stopRecording = () => {
    console.log('[Voice] Attempting to stop recording...');
    Voice.stop()
      .then(() => {
        console.log('[Voice] Recording stopped successfully');
      })
      .catch((error) => {
        console.error('[Voice] Stop error:', error);
        setIsRecording(false);
      });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // Tolerance for being considered "at the bottom"

    // Ensure contentSize.height is valid to prevent errors with empty lists or during initial layout
    if (contentSize.height <= 0) {
      setIsNearBottom(true); // Default to true if no content or layout not fully resolved
      return;
    }

    const isCurrentlyNearBottom = 
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    setIsNearBottom(isCurrentlyNearBottom);
  };

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Only auto-scroll if we're near bottom or it's a new message
      if (isNearBottom) {
        scrollTimeoutRef.current = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated });
        }, 150);
      }
    }
  };

  const handleContentSizeChange = (contentWidth: number) => {
    scrollToBottom(true);
  };

  const handleLayout = () => {
    scrollToBottom(false);
  };

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await chatbotApi.getHistory();
        if (history.length > 0) {
          const formattedMessages = history.map((msg: any) => ({
            id: msg.timestamp || Date.now().toString(),
            text: msg.content,
            fromUser: msg.role === 'user',
            confidence: msg.confidence,
            sources: msg.sources,
            relevantMemories: msg.relevantMemories,
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadHistory();
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const addMessage = (
    text: string,
    fromUser: boolean,
    error: boolean = false,
    confidence?: string,
    sources?: string[],
    relevantMemories?: Message['relevantMemories']
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      fromUser,
      error,
      confidence,
      sources,
      relevantMemories,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userText = inputText.trim();
    addMessage(userText, true);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatbotApi.sendMessage(userText);
      const processedMemories = response.relevantMemories?.map(memory => ({
        title: memory.title || '',
        createdAt: memory.createdAt || new Date().toISOString(),
        content: memory.content || '',
        type: memory.type || 'text',
        imagePath: memory.imagePath,
        description: memory.description || ''
      }));

      addMessage(
        response.text,
        false,
        false,
        response.confidence,
        response.sources,
        processedMemories
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response. Please try again.';
      addMessage(errorMessage, false, true);
    } finally {
      setIsTyping(false);
    }
  };

  const renderSources = (sources?: string[], relevantMemories?: Message['relevantMemories']) => {
    if (!sources?.length && !relevantMemories?.length) return null;

    const screenWidth = Dimensions.get('window').width;
    const imageWidth = screenWidth * 0.7;

    return (
      <View style={styles.sourcesContainer}>
        {sources?.map((source, index) => (
          <Text key={index} style={styles.sourceText}>
            Source: {source}
          </Text>
        ))}
        {relevantMemories?.map((memory, index) => {
          console.log(`[Memory Debug] Processing memory ${index}:`, {
            title: memory.title,
            type: memory.type,
            hasImagePath: !!memory.imagePath,
            imagePath: memory.imagePath
          });
          
          const imagePath = memory.type === 'image' && memory.imagePath ? 
            getImagePath(memory.imagePath) : null;

          return (
            <View key={index} style={styles.memorySource}>
              <Text style={styles.memoryTitle}>
                {memory.title || 'Memory'} ({new Date(memory.createdAt).toLocaleDateString()})
              </Text>
              {imagePath && (
                <View>
                  <Image
                    source={{ uri: imagePath }}
                    style={[styles.memoryImage, { width: imageWidth }]}
                    resizeMode="contain"
                    onLoadStart={() => console.log(`[Image Debug] Starting to load image: ${imagePath}`)}
                    onLoad={() => console.log(`[Image Debug] Successfully loaded image: ${imagePath}`)}
                    onError={(error) => console.error(`[Image Debug] Error loading image: ${imagePath}`, error.nativeEvent.error)}
                  />
                  {__DEV__ && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(imagePath)}
                      style={styles.debugLink}
                    >
                      <Text style={styles.debugText}>
                        {imagePath}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {memory.content && !imagePath && (
                <Text style={styles.memoryContent} numberOfLines={2}>
                  {memory.content}
                </Text>
              )}
              {memory.content && imagePath && (
                <Text style={[styles.memoryContent, { marginTop: 4 }]} numberOfLines={2}>
                  {memory.content}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageContainer}>
      <View
        style={[
          styles.messageBubble,
          item.fromUser ? styles.userBubble : styles.botBubble,
          item.error && styles.errorBubble,
        ]}
      >
        <Text style={[
          item.fromUser ? styles.userText : styles.botText,
          item.error && styles.errorText,
        ]}>
          {item.text}
        </Text>
        {!item.fromUser && item.confidence && (
          <Text style={styles.confidenceText}>
            Confidence: {item.confidence}
          </Text>
        )}
      </View>
      {!item.fromUser && renderSources(item.sources, item.relevantMemories)}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          style={[styles.chatContainer, { paddingRight: 2 }]}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.chatContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          persistentScrollbar={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 100,
          }}
          inverted={false}
          scrollEnabled={true}
        />

        {isTyping && (
          <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color="#6750A4" />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <SvgXml
              xml={micIconXml}
              width={24}
              height={24}
              color={isRecording ? '#FFFFFF' : '#333333'}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: '#E0E0E0',
  },
  chatContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6750A4',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F0EAF9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#FFEBEE',
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userText: {
    color: 'white',
    fontSize: 16,
  },
  botText: {
    color: '#4B4B6A',
    fontSize: 16,
  },
  errorText: {
    color: '#B71C1C',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sourcesContainer: {
    marginTop: 4,
    marginLeft: 12,
  },
  sourceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  memorySource: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#F5F0FF',
    borderRadius: 8,
  },
  memoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6750A4',
  },
  memoryContent: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  memoryImage: {
    height: 200,
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: '#E0E0E0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F7F7',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    backgroundColor: '#6750A4',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  sendButtonDisabled: {
    backgroundColor: '#C4C4C4',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  debugLink: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#0066cc',
    textDecorationLine: 'underline',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  voiceButton: {
    backgroundColor: '#ddd',
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#4CAF50',
  },
});

export default MemoryChatbotScreen;
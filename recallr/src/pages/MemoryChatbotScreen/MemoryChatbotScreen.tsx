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
} from 'react-native';
import { chatbotApi } from '../../services/api';

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
    type?: string;
    imagePath?: string;
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
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Add user message
    const userText = inputText.trim();
    addMessage(userText, true);
    setInputText('');
    setIsTyping(true);

    try {
      // Get bot response from API
      const response = await chatbotApi.sendMessage(userText);
      addMessage(
        response.text,
        false,
        false,
        response.confidence,
        response.sources,
        response.relevantMemories
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
});

export default MemoryChatbotScreen;

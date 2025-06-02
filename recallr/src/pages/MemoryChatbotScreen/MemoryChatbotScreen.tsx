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
  Alert,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { SvgXml } from 'react-native-svg';
import { chatbotApi } from '../../services/api';
import { config } from '../../config/environment';

const micIconXml = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/>
  <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="currentColor"/>
</svg>`;

// Use centralized configuration for uploads base path
const UPLOADS_BASE_PATH = config.UPLOADS_BASE_PATH;

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
    url?: string;
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
  const hasInitializedVoice = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize voice recognition
  useEffect(() => {
    if (hasInitializedVoice.current) return;
    hasInitializedVoice.current = true;

    const voiceStart = (e: SpeechStartEvent) => {
      console.log('[Voice] Started recording');
      setIsRecording(true);
    };

    const voiceEnd = (e: SpeechEndEvent) => {
      console.log('[Voice] Stopped recording');
      setIsRecording(false);
    };

    const voiceResults = (e: SpeechResultsEvent) => {
      const spokenText = e.value?.[0] || '';
      console.log('[Voice] Results:', spokenText);
      if (spokenText) {
        setInputText(spokenText);
        // Optionally auto-send the message
        // handleSendMessage();
      }
    };

    const voiceError = (e: SpeechErrorEvent) => {
      console.error('[Voice] Error:', e);
      setIsRecording(false);
    };

    // Check if Voice module is available before setting up listeners
    if (Voice && typeof Voice.onSpeechStart === 'function') {
      Voice.onSpeechStart = voiceStart;
      Voice.onSpeechEnd = voiceEnd;
      Voice.onSpeechResults = voiceResults;
      Voice.onSpeechError = voiceError;

      // Initialize Voice with better error handling
      if (typeof Voice.isAvailable === 'function') {
        Voice.isAvailable().then(() => {
          console.log('[Voice] Voice recognition is available');
        }).catch(e => {
          console.error('[Voice] Voice recognition not available:', e);
        });
      } else {
        console.warn('[Voice] Voice.isAvailable is not a function');
      }
    } else {
      console.warn('[Voice] Voice module not properly initialized');
    }

    return () => {
      if (Voice && typeof Voice.destroy === 'function') {
        Voice.destroy().then(() => {
          console.log('[Voice] Destroyed');
        }).catch(e => {
          console.error('[Voice] Error destroying:', e);
        });
      }
      if (Voice && typeof Voice.removeAllListeners === 'function') {
        Voice.removeAllListeners();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!Voice || typeof Voice.start !== 'function') {
        console.error('[Voice] Voice module not available for recording');
        setIsRecording(false);
        return;
      }
      
      console.log('[Voice] Attempting to start recording...');
      await Voice.start('en-US');
      console.log('[Voice] Recording started successfully');
    } catch (error) {
      console.error('[Voice] Start error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!Voice || typeof Voice.stop !== 'function') {
        console.error('[Voice] Voice module not available for stopping');
        setIsRecording(false);
        return;
      }
      
      console.log('[Voice] Attempting to stop recording...');
      await Voice.stop();
      console.log('[Voice] Recording stopped successfully');
    } catch (error) {
      console.error('[Voice] Stop error:', error);
      setIsRecording(false);
    }
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

  // Function to detect if a string is a URL
  const isURL = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    
    const trimmed = str.trim();
    console.log(`[URL Debug] Checking if "${trimmed.substring(0, 50)}..." is a URL`);
    
    // Simple but effective URL detection
    const urlPatterns = [
      /^https?:\/\//i,                          // Starts with http:// or https://
      /^www\./i,                                // Starts with www.
      /\.(com|org|net|edu|gov|io|co\.uk|de|fr|jp|in|instagram\.com|youtube\.com)/i  // Contains common TLDs
    ];
    
    const isValidURL = urlPatterns.some(pattern => pattern.test(trimmed));
    console.log(`[URL Debug] Result: ${isValidURL}`);
    
    return isValidURL;
  };

  // Function to extract domain from URL for display
  const getDomainFromURL = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Function to get platform-specific icon or styling for different social platforms
  const getPlatformInfo = (url: string) => {
    const domain = getDomainFromURL(url).toLowerCase();
    
    if (domain.includes('instagram')) {
      return { platform: 'Instagram', color: '#E4405F' };
    } else if (domain.includes('twitter') || domain.includes('x.com')) {
      return { platform: 'Twitter', color: '#1DA1F2' };
    } else if (domain.includes('youtube')) {
      return { platform: 'YouTube', color: '#FF0000' };
    } else if (domain.includes('linkedin')) {
      return { platform: 'LinkedIn', color: '#0077B5' };
    } else if (domain.includes('facebook')) {
      return { platform: 'Facebook', color: '#4267B2' };
    } else {
      return { platform: getDomainFromURL(url), color: '#6750A4' };
    }
  };

  // Function to render link card component
  const renderLinkCard = (url: string, index: number | string) => {
    const platformInfo = getPlatformInfo(url);
    const displayUrl = url.startsWith('http') ? url : `https://${url}`;
    
    console.log(`[Link Card Debug] Rendering link card for URL: ${displayUrl}`);
    
    return (
      <TouchableOpacity
        key={index}
        style={styles.linkCard}
        onPress={() => {
          console.log(`[Link Card Debug] TouchableOpacity pressed for URL: ${displayUrl}`);
          try {
            Linking.openURL(displayUrl)
              .then(() => {
                console.log(`[Link Card Debug] Successfully opened URL: ${displayUrl}`);
              })
              .catch((error) => {
                console.error(`[Link Card Debug] Failed to open URL: ${displayUrl}`, error);
                Alert.alert('Error', 'Could not open the link');
              });
          } catch (error) {
            console.error(`[Link Card Debug] Error in onPress handler:`, error);
          }
        }}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Open ${platformInfo.platform} link`}
      >
        <View style={styles.linkCardContent}>
          <View style={[styles.linkPlatformIndicator, { backgroundColor: platformInfo.color }]} />
          <View style={styles.linkTextContainer}>
            <Text style={styles.linkPlatformText} numberOfLines={1}>
              {platformInfo.platform}
            </Text>
            <Text style={styles.linkUrlText} numberOfLines={2}>
              {getDomainFromURL(url)}
            </Text>
          </View>
          <Text style={styles.linkActionText}>→</Text>
        </View>
      </TouchableOpacity>
    );
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
        description: memory.description || '',
        url: memory.url,
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

    // Debug logging
    console.log('[Source Debug] Sources received:', sources);
    console.log('[Source Debug] Relevant memories:', relevantMemories);

    return (
      <View style={styles.sourcesContainer}>
        {sources?.map((source, index) => {
          console.log(`[Source Debug] Processing source ${index}: "${source}"`);
          const isSourceURL = isURL(source);
          console.log(`[Source Debug] Is URL check result:`, isSourceURL);
          
          // Check if source is a URL
          if (isSourceURL) {
            console.log(`[Source Debug] Rendering link card for: ${source}`);
            return (
              <View key={`source-container-${index}`}>
                {renderLinkCard(source, `source-${index}`)}
              </View>
            );
          } else {
            // Render as regular text source
            return (
              <Text key={`source-text-${index}`} style={styles.sourceText}>
                Source: {source}
              </Text>
            );
          }
        })}
        {relevantMemories?.map((memory, index) => {
          console.log(`[Memory Debug] Processing memory ${index}:`, {
            title: memory.title,
            type: memory.type,
            hasImagePath: !!memory.imagePath,
            imagePath: memory.imagePath,
            url: memory.url,
            content: memory.content?.substring(0, 100) + '...',
            description: memory.description?.substring(0, 100) + '...'
          });
          
          const imagePath = memory.type === 'image' && memory.imagePath ? 
            getImagePath(memory.imagePath) : null;

          // For link-type memories, prioritize the url field
          let linkToOpen = null;
          if (memory.type === 'link' && memory.url) {
            linkToOpen = memory.url;
            console.log(`[Memory Debug] Link-type memory, using url field: ${linkToOpen}`);
          } else {
            // For other types, check if content or description contains URLs
            console.log(`[Memory Debug] Checking memory content for URLs:`);
            console.log(`[Memory Debug] - Content: "${memory.content?.substring(0, 50)}..."`);
            console.log(`[Memory Debug] - Description: "${memory.description?.substring(0, 50)}..."`);
            console.log(`[Memory Debug] - Title: "${memory.title?.substring(0, 50)}..."`);
            
            const contentIsURL = memory.content && isURL(memory.content.trim());
            const descriptionIsURL = memory.description && isURL(memory.description.trim());
            const titleIsURL = memory.title && isURL(memory.title.trim());
            
            console.log(`[Memory Debug] URL check results:`, {
              contentIsURL,
              descriptionIsURL,
              titleIsURL
            });
            
            if (contentIsURL && memory.content) linkToOpen = memory.content.trim();
            else if (descriptionIsURL && memory.description) linkToOpen = memory.description.trim();
            else if (titleIsURL && memory.title) linkToOpen = memory.title.trim();
          }
          
          const containsURL = !!linkToOpen;
          console.log(`[Memory Debug] Final link to open: ${linkToOpen}`);
          console.log(`[Memory Debug] Contains URL overall: ${containsURL}`);

          const memoryCard = (
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
                <View>
                  {/* For link-type memories, show a link card if there's a URL */}
                  {memory.type === 'link' && memory.url ? (
                    renderLinkCard(memory.url, `content-${index}`)
                  ) : (
                    /* For other types, check if content contains URLs */
                    isURL(memory.content.trim()) ? (
                      renderLinkCard(memory.content.trim(), `content-${index}`)
                    ) : (
                      <Text style={styles.memoryContent} numberOfLines={2}>
                        {memory.content}
                      </Text>
                    )
                  )}
                </View>
              )}
              {memory.content && imagePath && (
                <View>
                  {/* For link-type memories, show a link card if there's a URL */}
                  {memory.type === 'link' && memory.url ? (
                    <View style={{ marginTop: 4 }}>
                      {renderLinkCard(memory.url, `content-${index}`)}
                    </View>
                  ) : (
                    /* For other types, check if content contains URLs */
                    isURL(memory.content.trim()) ? (
                      <View style={{ marginTop: 4 }}>
                        {renderLinkCard(memory.content.trim(), `content-${index}`)}
                      </View>
                    ) : (
                      <Text style={[styles.memoryContent, { marginTop: 4 }]} numberOfLines={2}>
                        {memory.content}
                      </Text>
                    )
                  )}
                </View>
              )}
              {/* Also check description field for URLs */}
              {memory.description && memory.description !== memory.content && (
                <View style={{ marginTop: 4 }}>
                  {isURL(memory.description.trim()) ? (
                    renderLinkCard(memory.description.trim(), `desc-${index}`)
                  ) : (
                    <Text style={styles.memoryContent} numberOfLines={2}>
                      {memory.description}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );

          // If the memory contains a URL, make the entire card clickable
          if (containsURL) {
            if (linkToOpen) {
              return (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => {
                    console.log('[Memory Debug] Opening URL from memory:', linkToOpen);
                    Linking.openURL(linkToOpen.startsWith('http') ? linkToOpen : `https://${linkToOpen}`);
                  }}
                  activeOpacity={0.7}
                >
                  {memoryCard}
                </TouchableOpacity>
              );
            }
          }

          return memoryCard;
        })}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Debug logging for the message structure
    console.log('[Message Debug] Full message item:', {
      id: item.id,
      text: item.text?.substring(0, 100) + '...',
      fromUser: item.fromUser,
      sources: item.sources,
      relevantMemories: item.relevantMemories?.length || 0
    });

    return (
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
  };

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
  linkCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'visible',
    zIndex: 1,
  },
  linkCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  linkPlatformIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  linkTextContainer: {
    flex: 1,
    pointerEvents: 'none',
  },
  linkPlatformText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    pointerEvents: 'none',
  },
  linkUrlText: {
    fontSize: 12,
    color: '#666',
    pointerEvents: 'none',
  },
  linkActionText: {
    fontSize: 16,
    color: '#6750A4',
    fontWeight: '600',
    paddingLeft: 8,
    pointerEvents: 'none',
  },
});

export default MemoryChatbotScreen;

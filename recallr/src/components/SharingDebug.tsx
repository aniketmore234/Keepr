import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharingService } from '../services/SharingService';

const SharingDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load persisted logs on mount
  useEffect(() => {
    loadPersistedLogs();
  }, []);

  const loadPersistedLogs = async () => {
    try {
      const persistedLogs = await AsyncStorage.getItem('sharing_debug_logs');
      if (persistedLogs) {
        setLogs(JSON.parse(persistedLogs));
      }
    } catch (error) {
      console.log('Could not load persisted logs:', error);
    }
  };

  const saveLogs = async (newLogs: string[]) => {
    try {
      await AsyncStorage.setItem('sharing_debug_logs', JSON.stringify(newLogs));
    } catch (error) {
      console.log('Could not save logs:', error);
    }
  };

  useEffect(() => {
    // Override console.log to capture ALL logs for debugging
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      const message = args.join(' ');
      // Capture ALL logs for now to debug the issue
      const newLog = `${new Date().toLocaleTimeString()}: LOG: ${message}`;
      setLogs(prev => {
        const updated = [...prev.slice(-50), newLog];
        saveLogs(updated); // Persist logs
        return updated;
      });
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      const newLog = `${new Date().toLocaleTimeString()}: ERROR: ${message}`;
      setLogs(prev => {
        const updated = [...prev.slice(-50), newLog];
        saveLogs(updated);
        return updated;
      });
      originalError(...args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      const newLog = `${new Date().toLocaleTimeString()}: WARN: ${message}`;
      setLogs(prev => {
        const updated = [...prev.slice(-50), newLog];
        saveLogs(updated);
        return updated;
      });
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const handleManualCheck = async () => {
    setIsProcessing(true);
    try {
      // Since we removed processPendingSharedContent, let's check the pending content directly
      const pendingContent = await sharingService.getPendingSharedContent();
      Alert.alert('Debug', `Found ${pendingContent.length} pending items. Check logs for details.`);
      console.log('🔍 Manual check found:', pendingContent);
    } catch (error) {
      Alert.alert('Debug', `Error during manual check: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearLogs = async () => {
    setLogs([]);
    try {
      await AsyncStorage.removeItem('sharing_debug_logs');
    } catch (error) {
      console.log('Could not clear persisted logs:', error);
    }
  };

  const handleTestUrl = async () => {
    setIsProcessing(true);
    try {
      // Simulate sharing an Instagram URL
      const testUrl = 'https://www.instagram.com/p/test123/';
      console.log('🔍 Testing with URL:', testUrl);
      
      // You can add more test logic here if needed
      Alert.alert('Debug', `Test URL logged: ${testUrl}`);
    } catch (error) {
      Alert.alert('Debug', `Error during test: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sharing Debug Panel</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isProcessing && styles.buttonDisabled]} 
          onPress={handleManualCheck}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Manual Check</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, isProcessing && styles.buttonDisabled]} 
          onPress={handleTestUrl}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Test URL</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={handleClearLogs}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Sharing Logs ({logs.length}):</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
        {logs.length === 0 && (
          <Text style={styles.noLogsText}>No logs yet. Try sharing some content!</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logText: {
    fontSize: 10,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  noLogsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
});

export default SharingDebug; 
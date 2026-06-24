import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onSubmit: (url: string) => void;
  disabled: boolean;
}

const SUPPORTED_PREFIXES = [
  'https://www.youtube.com/',
  'https://youtu.be/',
  'https://www.tiktok.com/',
  'https://vm.tiktok.com/',
];

function isSupportedUrl(url: string): boolean {
  return SUPPORTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export default function UrlInputBar({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleExtract = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isSupportedUrl(trimmed)) {
      setError('Please paste a YouTube or TikTok URL.');
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={(t) => { setUrl(t); setError(null); }}
          placeholder="Paste a YouTube or TikTok URL"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!disabled}
          returnKeyType="go"
          onSubmitEditing={handleExtract}
        />
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={handleExtract}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Extract</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  button: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#B0C4DE' },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  error: { marginTop: 6, fontSize: 13, color: '#FF3B30' },
});

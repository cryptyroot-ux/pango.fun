import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getApiBase } from '../api/pangoApi';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PangoButton } from '../components/PangoButton';
import { colors, radius } from '../theme';

export function LoginScreen({ error, loading, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function submit() {
    onLogin(username.trim(), password);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Badge label="Identity gate" tone="hot" />
        <Text style={styles.title}>Pango-OS</Text>
        <Text style={styles.subtitle}>Operator console for Hermes chat, Observe, Tasks, and Config.</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Masuk operator</Text>
        <Text style={styles.help}>
          Gunakan credential production pango.fun. Local mock/proxy tidak menyimpan password di app.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setUsername}
          placeholder="Operator ID"
          placeholderTextColor={colors.muted}
          returnKeyType="next"
          style={styles.input}
          value={username}
        />
        <TextInput
          onChangeText={setPassword}
          onSubmitEditing={submit}
          placeholder="Access phrase"
          placeholderTextColor={colors.muted}
          returnKeyType="go"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PangoButton
          disabled={loading || !username.trim() || !password}
          icon={loading ? '' : '→'}
          label={loading ? 'Verifying...' : 'Unlock Pango'}
          onPress={submit}
          variant="primary"
        />
        {loading ? <ActivityIndicator color={colors.amber} style={styles.spinner} /> : null}
        <Text style={styles.apiBase}>API: {getApiBase() || 'same-origin'}</Text>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 18,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: 28,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoText: {
    color: colors.black,
    fontSize: 38,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 360,
    textAlign: 'center',
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  help: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    backgroundColor: colors.panelTint,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    lineHeight: 18,
  },
  spinner: {
    marginTop: 4,
  },
  apiBase: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
});

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MessageBubble } from '../components/MessageBubble';
import { PangoButton } from '../components/PangoButton';
import { colors, radius } from '../theme';

export function ChatScreen({ error, messages, sending, sessionId, onSend }) {
  const [draft, setDraft] = useState('');
  const sessionLabel = useMemo(() => {
    if (!sessionId) return 'new session';
    return sessionId.length > 22 ? `${sessionId.slice(0, 22)}...` : sessionId;
  }, [sessionId]);

  function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    onSend(text);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Hermes stream • {sessionLabel}</Text>
        </View>
        {sending ? <Text style={styles.live}>streaming</Text> : <Text style={styles.ready}>ready</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="Message Pango..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft}
        />
        <PangoButton disabled={sending || !draft.trim()} icon="➜" label="Send" onPress={submit} variant="primary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  live: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  ready: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messages: {
    paddingBottom: 6,
  },
  error: {
    color: colors.red,
    fontSize: 12,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
});

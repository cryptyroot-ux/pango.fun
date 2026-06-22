import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as pangoApi from './api/pangoApi';
import { BottomTabs } from './components/BottomTabs';
import { TopBar } from './components/TopBar';
import { ChatScreen } from './screens/ChatScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ObserveScreen } from './screens/ObserveScreen';
import { TasksScreen } from './screens/TasksScreen';
import { VoiceScreen } from './screens/VoiceScreen';
import { colors } from './theme';

const introMessages = [
  {
    id: 'system-ready',
    role: 'system',
    content: 'Pango mobile shell siap. Login production memakai cookie HttpOnly dari gateway pango.fun.',
    meta: 'Pango • system',
  },
  {
    id: 'assistant-ready',
    role: 'assistant',
    content: 'Kirim pesan untuk membuka stream Hermes. Status, Tasks, dan Config tersedia dari tab bawah.',
    meta: 'Pango • online',
  },
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredSessionId() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('pango_session_id') || '';
  } catch {
    return '';
  }
}

function writeStoredSessionId(sessionId) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (sessionId) window.localStorage.setItem('pango_session_id', sessionId);
    else window.localStorage.removeItem('pango_session_id');
  } catch {
    // Storage is a convenience only; auth still lives in the server cookie.
  }
}

export default function PangoApp() {
  const [activeTab, setActiveTab] = useState('chat');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [csrf, setCsrf] = useState('');
  const [sessionId, setSessionIdState] = useState(readStoredSessionId);
  const [messages, setMessages] = useState(introMessages);
  const [status, setStatus] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [config, setConfig] = useState(null);
  const [errors, setErrors] = useState({});

  const authenticated = Boolean(user);
  const backend = useMemo(() => status?.backend || (authenticated ? 'connected' : 'offline'), [authenticated, status]);

  const setSessionId = useCallback((nextSessionId) => {
    setSessionIdState(nextSessionId || '');
    writeStoredSessionId(nextSessionId || '');
  }, []);

  const setAreaError = useCallback((area, error) => {
    setErrors((current) => ({
      ...current,
      [area]: error ? String(error.message || error) : '',
    }));
  }, []);

  const updateMessage = useCallback((id, patch) => {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await pangoApi.status();
      setStatus(data);
      setAreaError('observe', '');
      return data;
    } catch (error) {
      setStatus((current) => current);
      setAreaError('observe', error);
      return null;
    }
  }, [setAreaError]);

  const loadTasks = useCallback(async () => {
    try {
      const data = await pangoApi.tasks();
      setTasks(data);
      setAreaError('tasks', '');
      return data;
    } catch (error) {
      setAreaError('tasks', error);
      return null;
    }
  }, [setAreaError]);

  const loadConfig = useCallback(async () => {
    try {
      const data = await pangoApi.config();
      setConfig(data);
      setAreaError('config', '');
      return data;
    } catch (error) {
      setAreaError('config', error);
      return null;
    }
  }, [setAreaError]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([loadStatus(), loadTasks(), loadConfig()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadConfig, loadStatus, loadTasks]);

  const bootstrapAuth = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const data = await pangoApi.me();
      setUser(data.user || { username: 'operator' });
      setCsrf(data.csrf || '');
      setAreaError('login', '');
      await refreshAll();
    } catch {
      setUser(null);
      setCsrf('');
    } finally {
      setCheckingAuth(false);
    }
  }, [refreshAll, setAreaError]);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const handleLogin = useCallback(
    async (username, password) => {
      setLoginLoading(true);
      setAreaError('login', '');
      try {
        const data = await pangoApi.login(username, password);
        setUser(data.user || { username });
        setCsrf(data.csrf || '');
        await refreshAll();
      } catch (error) {
        setAreaError('login', error);
      } finally {
        setLoginLoading(false);
      }
    },
    [refreshAll, setAreaError],
  );

  const handleLogout = useCallback(async () => {
    await pangoApi.logout(csrf);
    setUser(null);
    setCsrf('');
    setStatus(null);
    setTasks(null);
    setConfig(null);
    setSessionId('');
    setMessages(introMessages);
  }, [csrf, setSessionId]);

  const ensureCsrf = useCallback(async () => {
    if (csrf) return csrf;
    const data = await pangoApi.me();
    setUser(data.user || { username: 'operator' });
    setCsrf(data.csrf || '');
    return data.csrf || '';
  }, [csrf]);

  const handleSend = useCallback(
    async (text) => {
      const userMessage = {
        id: makeId('user'),
        role: 'user',
        content: text,
        meta: 'You',
      };
      const liveId = makeId('pango');
      const liveMessage = {
        id: liveId,
        role: 'assistant',
        content: 'Pango sedang membalas...',
        meta: 'Pango • stream',
      };

      setMessages((current) => [...current, userMessage, liveMessage]);
      setSending(true);
      setAreaError('chat', '');

      let assistant = '';
      let usage = {};
      let elapsedMs = null;

      try {
        const token = await ensureCsrf();
        await pangoApi.streamChat({
          message: text,
          sessionId,
          csrf: token,
          onEvent(event, payload) {
            if (payload.session_id) setSessionId(payload.session_id);

            if (event === 'assistant.delta') {
              assistant += payload.delta || '';
              updateMessage(liveId, {
                role: 'assistant',
                content: assistant || 'Pango sedang membalas...',
                meta: 'Pango • streaming',
              });
            } else if (event === 'assistant.completed') {
              assistant = payload.content || assistant;
              updateMessage(liveId, {
                role: 'assistant',
                content: assistant || 'Pango belum mengembalikan jawaban.',
                meta: 'Pango • completed',
              });
            } else if (event === 'run.completed') {
              usage = payload.usage || usage;
            } else if (event === 'bridge.completed') {
              elapsedMs = payload.elapsed_ms || elapsedMs;
            } else if (event === 'tool.progress' || event === 'tool.started' || event === 'tool.completed') {
              updateMessage(liveId, {
                role: 'assistant',
                content: assistant || 'Pango sedang bekerja...',
                meta: [payload.tool_name, payload.preview || payload.delta].filter(Boolean).join(' • '),
              });
            } else if (event === 'error') {
              throw new Error(payload.message || 'stream_error');
            }
          },
        });

        if (!assistant) {
          updateMessage(liveId, {
            role: 'assistant',
            content: 'Pango belum mengembalikan jawaban.',
            meta: 'Pango • empty stream',
          });
        } else {
          updateMessage(liveId, {
            meta: [
              usage.total_tokens ? `${usage.total_tokens} tok` : '',
              elapsedMs ? `${elapsedMs} ms` : '',
            ].filter(Boolean).join(' • ') || 'Pango • done',
          });
        }

        loadTasks().catch(() => null);
      } catch (error) {
        updateMessage(liveId, {
          role: 'tool',
          content: `Koneksi Pango terputus. ${String(error.message || error)}`,
          meta: 'Pango • stream error',
        });
        setAreaError('chat', error);
      } finally {
        setSending(false);
      }
    },
    [ensureCsrf, loadTasks, sessionId, setAreaError, setSessionId, updateMessage],
  );

  const handleVoiceTranscript = useCallback(
    (text) => {
      setActiveTab('chat');
      handleSend(text);
    },
    [handleSend],
  );

  function renderScreen() {
    if (activeTab === 'tasks') {
      return <TasksScreen error={errors.tasks} loading={refreshing} onRefresh={loadTasks} tasks={tasks} />;
    }
    if (activeTab === 'voice') {
      return <VoiceScreen onSendTranscript={handleVoiceTranscript} />;
    }
    if (activeTab === 'observe') {
      return <ObserveScreen error={errors.observe} loading={refreshing} onRefresh={loadStatus} status={status} />;
    }
    if (activeTab === 'config') {
      return (
        <ConfigScreen
          config={config}
          error={errors.config}
          onLoadConfig={loadConfig}
          onLogout={handleLogout}
          user={user}
        />
      );
    }
    return (
      <ChatScreen
        error={errors.chat}
        messages={messages}
        onSend={handleSend}
        sending={sending}
        sessionId={sessionId}
      />
    );
  }

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.amber} size="large" />
          <Text style={styles.loadingText}>Checking Pango session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <LoginScreen error={errors.login} loading={loginLoading} onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.app}>
        <TopBar backend={backend} onLogout={handleLogout} onRefresh={refreshAll} user={user} />
        <View style={styles.content}>{renderScreen()}</View>
        <BottomTabs active={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  app: {
    alignSelf: 'center',
    flex: 1,
    gap: 14,
    maxWidth: 900,
    padding: 14,
    width: '100%',
  },
  content: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },
});

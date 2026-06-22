import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PangoButton } from '../components/PangoButton';
import { colors, radius } from '../theme';

async function loadSpeechModule() {
  if (Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Expo Go tidak memuat ExpoSpeechRecognition. Install development build: npm run android:devbuild.');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Browser ini belum mendukung Web SpeechRecognition.');
    }
    return createWebSpeechModule(SpeechRecognition);
  }

  try {
    const speech = await import('expo-speech-recognition');
    return speech.ExpoSpeechRecognitionModule;
  } catch (error) {
    throw new Error(
      Platform.OS === 'android'
        ? 'Speech recognition native module belum tersedia. Jalankan development build: npm run android:devbuild.'
        : String(error.message || error),
    );
  }
}

function createEmitter() {
  const listeners = new Map();
  return {
    addListener(name, listener) {
      const set = listeners.get(name) || new Set();
      set.add(listener);
      listeners.set(name, set);
      return {
        remove() {
          set.delete(listener);
        },
      };
    },
    emit(name, payload) {
      (listeners.get(name) || []).forEach((listener) => listener(payload));
    },
  };
}

function createWebSpeechModule(SpeechRecognition) {
  const emitter = createEmitter();
  let recognition = null;

  function ensureRecognition(options = {}) {
    const next = new SpeechRecognition();
    next.lang = options.lang || 'id-ID';
    next.interimResults = Boolean(options.interimResults);
    next.continuous = Boolean(options.continuous);
    next.maxAlternatives = options.maxAlternatives || 1;
    next.onstart = () => emitter.emit('start', null);
    next.onend = () => emitter.emit('end', null);
    next.onerror = (event) => emitter.emit('error', { error: event.error, message: event.message || event.error });
    next.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const first = result?.[0];
      emitter.emit('result', {
        isFinal: Boolean(result?.isFinal),
        results: first ? [{ transcript: first.transcript, confidence: first.confidence ?? -1 }] : [],
      });
    };
    return next;
  }

  return {
    addListener: emitter.addListener,
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: async () => ({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' }),
    start(options) {
      recognition = ensureRecognition(options);
      recognition.start();
    },
    stop() {
      recognition?.stop?.();
    },
    abort() {
      recognition?.abort?.();
    },
  };
}

export function VoiceScreen({ onSendTranscript }) {
  const [module, setModule] = useState(null);
  const [ready, setReady] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partial, setPartial] = useState('');
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(0);
  const subscriptions = useRef([]);

  const statusLabel = useMemo(() => {
    if (recognizing) return 'listening';
    if (ready) return 'ready';
    return 'setup';
  }, [ready, recognizing]);

  useEffect(() => {
    let mounted = true;
    loadSpeechModule()
      .then((speechModule) => {
        if (!mounted) return;
        setModule(speechModule);
        setReady(Boolean(speechModule?.isRecognitionAvailable?.() ?? true));
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(String(loadError.message || loadError));
        setReady(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    subscriptions.current.forEach((subscription) => subscription?.remove?.());
    subscriptions.current = [];

    if (!module?.addListener) return undefined;

    subscriptions.current = [
      module.addListener('start', () => {
        setRecognizing(true);
        setError('');
      }),
      module.addListener('end', () => setRecognizing(false)),
      module.addListener('result', (event) => {
        const next = event?.results?.[0]?.transcript || '';
        if (!next) return;
        if (event?.isFinal) {
          setTranscript((current) => [current, next].filter(Boolean).join(' ').trim());
          setPartial('');
        } else {
          setPartial(next);
        }
      }),
      module.addListener('error', (event) => {
        setRecognizing(false);
        setError(event?.message || event?.error || 'Speech recognition failed.');
      }),
      module.addListener('volumechange', (event) => setVolume(Number(event?.value || 0))),
    ];

    return () => {
      subscriptions.current.forEach((subscription) => subscription?.remove?.());
      subscriptions.current = [];
    };
  }, [module]);

  const startListening = useCallback(async () => {
    if (!module) {
      setError('Speech recognition belum siap.');
      return;
    }

    try {
      const permission = await module.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone/speech permission ditolak.');
        return;
      }

      setError('');
      setPartial('');
      module.start({
        lang: 'id-ID',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: ['Pango', 'Hermes', 'status server', 'task', 'config'],
      });
    } catch (startError) {
      setError(String(startError.message || startError));
    }
  }, [module]);

  const stopListening = useCallback(() => {
    try {
      module?.stop?.();
    } catch (stopError) {
      setError(String(stopError.message || stopError));
    }
  }, [module]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setPartial('');
    setError('');
  }, []);

  const sendTranscript = useCallback(() => {
    const text = [transcript, partial].filter(Boolean).join(' ').trim();
    if (!text) {
      setError('Belum ada transcript untuk dikirim.');
      return;
    }
    onSendTranscript(text);
  }, [onSendTranscript, partial, transcript]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voice</Text>
          <Text style={styles.subtitle}>Indonesian operator listening for Android and web.</Text>
        </View>
        <Badge label={statusLabel} tone={recognizing ? 'warn' : ready ? 'good' : 'neutral'} />
      </View>

      <Card style={styles.stage}>
        <View style={[styles.orb, recognizing && styles.orbLive]}>
          <Text style={styles.orbText}>{recognizing ? '●' : '◉'}</Text>
        </View>
        <Text style={styles.stageTitle}>{recognizing ? 'Listening...' : 'Tap start to listen'}</Text>
        <Text style={styles.stageSub}>
          {ready
            ? 'Ucapkan instruksi seperti: Pango, cek status server.'
            : 'Voice recognition perlu development build Android karena memakai native speech module.'}
        </Text>
        <View style={styles.volumeTrack}>
          <View style={[styles.volumeFill, { width: `${Math.max(4, Math.min(100, (volume + 2) * 8))}%` }]} />
        </View>
      </Card>

      <Card style={styles.transcriptCard}>
        <Text style={styles.label}>Transcript</Text>
        <Text style={styles.transcript}>
          {[transcript, partial].filter(Boolean).join(' ') || 'Belum ada suara yang ditranskrip.'}
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {recognizing ? (
          <PangoButton icon="■" label="Stop" onPress={stopListening} variant="danger" />
        ) : (
          <PangoButton disabled={!module || !ready} icon="🎙" label="Start" onPress={startListening} variant="primary" />
        )}
        <PangoButton icon="➜" label="Send to Chat" onPress={sendTranscript} />
        <PangoButton icon="×" label="Clear" onPress={clearTranscript} />
      </View>

      <Card style={styles.note}>
        <Text style={styles.label}>Android build note</Text>
        <Text style={styles.noteText}>
          Expo Go tidak memuat native module pihak ketiga. Untuk listening asli di Android, jalankan `npm run
          android:devbuild` atau buat EAS development build.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 12,
    paddingBottom: 8,
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
  stage: {
    alignItems: 'center',
    gap: 12,
  },
  orb: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,184,107,0.10)',
    borderColor: colors.lineHot,
    borderRadius: 90,
    borderWidth: 1,
    height: 168,
    justifyContent: 'center',
    width: 168,
  },
  orbLive: {
    backgroundColor: 'rgba(255,209,102,0.16)',
    borderColor: colors.yellow,
  },
  orbText: {
    color: colors.amber,
    fontSize: 48,
  },
  stageTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  stageSub: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 420,
    textAlign: 'center',
  },
  volumeTrack: {
    backgroundColor: colors.panelTint,
    borderRadius: radius.sm,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  volumeFill: {
    backgroundColor: colors.amber,
    height: '100%',
  },
  transcriptCard: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  transcript: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 66,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 8,
  },
  note: {
    gap: 8,
  },
  noteText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});

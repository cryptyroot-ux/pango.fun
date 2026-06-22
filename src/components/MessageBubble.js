import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function MessageBubble({ message }) {
  const mine = message.role === 'user';
  const system = message.role === 'system';

  return (
    <View style={[styles.wrap, mine && styles.wrapMine, system && styles.wrapSystem]}>
      <View style={[styles.bubble, mine && styles.mine, system && styles.system]}>
        <Text style={[styles.content, mine && styles.mineText]}>{message.content}</Text>
        {message.meta ? <Text style={[styles.meta, mine && styles.mineMeta]}>{message.meta}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  wrapMine: {
    alignItems: 'flex-end',
  },
  wrapSystem: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: '92%',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  mine: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  system: {
    backgroundColor: 'rgba(126,224,170,0.08)',
    borderColor: 'rgba(126,224,170,0.24)',
  },
  content: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  mineText: {
    color: '#fff',
  },
  meta: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 7,
  },
  mineMeta: {
    color: 'rgba(255,255,255,0.78)',
  },
});

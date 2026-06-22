import { StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

export function Badge({ label, tone = 'neutral', style }) {
  return (
    <Text style={[styles.badge, styles[tone], style]} numberOfLines={1}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.soft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  neutral: {
    backgroundColor: 'rgba(255,184,107,0.07)',
    borderColor: colors.line,
  },
  good: {
    backgroundColor: 'rgba(126,224,170,0.10)',
    borderColor: 'rgba(126,224,170,0.35)',
    color: colors.green,
  },
  warn: {
    backgroundColor: 'rgba(255,209,102,0.10)',
    borderColor: 'rgba(255,209,102,0.35)',
    color: colors.yellow,
  },
  hot: {
    backgroundColor: 'rgba(255,184,107,0.12)',
    borderColor: colors.lineHot,
    color: colors.amber,
  },
});

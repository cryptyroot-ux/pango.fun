import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

export function PangoButton({ label, icon, variant = 'soft', disabled, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'primary' && styles.primaryText]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,184,107,0.08)',
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  danger: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderColor: 'rgba(255,107,107,0.42)',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
  text: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryText: {
    color: '#fff',
  },
});

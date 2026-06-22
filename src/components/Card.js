import { View, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    ...shadow,
  },
});

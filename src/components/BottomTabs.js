import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

const tabs = [
  { key: 'chat', label: 'Chat', icon: '✦' },
  { key: 'tasks', label: 'Tasks', icon: '▤' },
  { key: 'voice', label: 'Voice', icon: '🎙' },
  { key: 'observe', label: 'Observe', icon: '◉' },
  { key: 'config', label: 'Config', icon: '▦' },
];

export function BottomTabs({ active, onChange }) {
  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, selected && styles.active]}>
            <Text style={[styles.icon, selected && styles.activeText]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.activeText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: 'rgba(8,5,2,0.94)',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 8,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: 'rgba(255,184,107,0.12)',
  },
  icon: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '900',
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  activeText: {
    color: colors.amber,
  },
});

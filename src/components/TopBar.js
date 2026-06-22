import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { PangoButton } from './PangoButton';
import { colors } from '../theme';

export function TopBar({ backend, user, onRefresh, onLogout }) {
  return (
    <View style={styles.topbar}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.title}>Pango-OS</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {user?.username ? `${user.username} • ${backend || 'connecting'}` : backend || 'connecting'}
          </Text>
        </View>
        <Badge label={backend === 'offline' ? 'offline' : 'online'} tone={backend === 'offline' ? 'warn' : 'good'} />
      </View>
      <View style={styles.actions}>
        <PangoButton label="Refresh" icon="↻" onPress={onRefresh} style={styles.actionButton} />
        <PangoButton label="Logout" icon="⏻" onPress={onLogout} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: 12,
    paddingBottom: 12,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoText: {
    color: colors.black,
    fontSize: 22,
    fontWeight: '900',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

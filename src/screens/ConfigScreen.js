import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getApiBase } from '../api/pangoApi';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PangoButton } from '../components/PangoButton';
import { colors } from '../theme';

export function ConfigScreen({ config, error, user, onLoadConfig, onLogout }) {
  const profiles = config?.profiles?.profiles || [];
  const toolsets = config?.toolsets?.enabled || [];

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Config</Text>
          <Text style={styles.subtitle}>Runtime mode, account, gateway, and toolsets.</Text>
        </View>
        <PangoButton icon="↻" label="Load" onPress={onLoadConfig} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>User</Text>
          <Badge label={user?.username || 'operator'} tone="good" />
        </View>
        <Text style={styles.value}>{user?.mode || 'production'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>API base</Text>
        <Text style={styles.value}>{getApiBase() || 'same-origin'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Profiles</Text>
        {profiles.length ? (
          profiles.map((profile) => (
            <Text key={profile.name} style={styles.value}>
              {profile.active ? '◆ ' : '◇ '}
              {profile.name} • {profile.model || 'model unknown'}
            </Text>
          ))
        ) : (
          <Text style={styles.value}>No profile data loaded.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Toolsets</Text>
        {toolsets.length ? (
          toolsets.map((toolset) => (
            <Text key={toolset.name} style={styles.value}>
              {toolset.name} • {(toolset.tools || []).length} tools
            </Text>
          ))
        ) : (
          <Text style={styles.value}>No toolset data loaded.</Text>
        )}
      </Card>

      <PangoButton icon="⏻" label="Logout" onPress={onLogout} variant="danger" />
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
  error: {
    color: colors.red,
    fontSize: 12,
  },
  card: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

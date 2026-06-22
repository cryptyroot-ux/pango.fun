import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PangoButton } from '../components/PangoButton';
import { colors } from '../theme';

function fmtBytes(n) {
  if (!Number.isFinite(n)) return '--';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = n;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function Metric({ label, value, detail }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </Card>
  );
}

export function ObserveScreen({ error, loading, status, onRefresh }) {
  const services = Object.entries(status?.services || {});

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.amber} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Observe</Text>
          <Text style={styles.subtitle}>Read-only production status from Pango API.</Text>
        </View>
        <PangoButton icon="↻" label="Refresh" onPress={onRefresh} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        <Metric label="CPU" value={`${status?.cpu?.percent ?? '--'}%`} detail="server-side sample" />
        <Metric
          label="Memory"
          value={`${status?.memory?.percent ?? '--'}%`}
          detail={`${fmtBytes(status?.memory?.used)} used`}
        />
        <Metric
          label="Hermes disk"
          value={`${status?.disk_hermes?.percent ?? '--'}%`}
          detail={`${fmtBytes(status?.disk_hermes?.free)} free`}
        />
        <Metric label="Backend" value={status?.backend || '--'} detail={status?.hermes?.summary || 'waiting'} />
      </View>
      <Card style={styles.services}>
        <Text style={styles.sectionTitle}>Services</Text>
        {services.length ? (
          services.map(([name, state]) => (
            <View key={name} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{name}</Text>
              <Badge label={String(state)} tone={state === 'active' ? 'good' : 'warn'} />
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No service data.</Text>
        )}
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
  error: {
    color: colors.red,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 8,
  },
  metricDetail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  services: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  serviceRow: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  serviceName: {
    color: colors.soft,
    flex: 1,
    fontSize: 13,
    marginRight: 10,
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
  },
});

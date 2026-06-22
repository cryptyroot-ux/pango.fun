import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PangoButton } from '../components/PangoButton';
import { colors } from '../theme';

const laneKeys = ['queue', 'running', 'blocked', 'done'];

export function TasksScreen({ error, loading, tasks, onRefresh }) {
  const lanes = tasks?.lanes || {};
  const total = tasks?.board?.kanban_task_count ?? 0;

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.amber} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>Kanban, bridge runs, approvals, and outputs.</Text>
        </View>
        <PangoButton icon="↻" label="Refresh" onPress={onRefresh} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Text style={styles.metricValue}>{total}</Text>
          <Text style={styles.metricLabel}>kanban tasks</Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={styles.metricValue}>{tasks?.bridge?.active_runs ?? 0}</Text>
          <Text style={styles.metricLabel}>active runs</Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={styles.metricValue}>{tasks?.recent_sessions?.length ?? 0}</Text>
          <Text style={styles.metricLabel}>sessions</Text>
        </Card>
      </View>
      {laneKeys.map((key) => {
        const cards = lanes[key] || [];
        return (
          <Card key={key} style={styles.lane}>
            <View style={styles.laneHead}>
              <Text style={styles.laneTitle}>{key}</Text>
              <Badge label={String(cards.length)} tone={key === 'blocked' ? 'warn' : 'neutral'} />
            </View>
            {cards.length ? (
              cards.map((card) => (
                <View key={card.id || card.title} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{card.title || 'Untitled'}</Text>
                  <Text style={styles.taskBody}>{card.body || card.status || 'No detail.'}</Text>
                  <Text style={styles.taskMeta}>{[card.assignee, card.status].filter(Boolean).join(' • ')}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>No items.</Text>
            )}
          </Card>
        );
      })}
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
    textTransform: 'capitalize',
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
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    padding: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  lane: {
    gap: 10,
  },
  laneHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  laneTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  taskCard: {
    backgroundColor: colors.panelTint,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  taskBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  taskMeta: {
    color: colors.amber,
    fontSize: 11,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
  },
});

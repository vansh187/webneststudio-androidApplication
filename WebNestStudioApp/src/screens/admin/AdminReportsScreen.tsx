import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Text } from '../../components/Text';
import { showAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../api/client';
import {
  useAdminReports,
  useBlockUser,
  useResolveReport,
} from '../../features/moderation/adminModerationQueries';
import type { MessageReport } from '../../types/api';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../utils/format';

export function AdminReportsScreen() {
  const query = useAdminReports('open');
  const reports = query.data ?? [];
  const blockUser = useBlockUser();
  const resolveReport = useResolveReport();

  const busy = blockUser.isPending || resolveReport.isPending;

  const confirmBlock = (report: MessageReport) => {
    showAlert(
      'Block this user?',
      `${report.reported_user.full_name || report.reported_user.email} will be signed out and won't be able to log in or send messages again until unblocked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser.mutateAsync(report.reported_user.id);
              await resolveReport.mutateAsync(report.id);
            } catch (err) {
              showAlert("Couldn't block user", getErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  const confirmDismiss = (report: MessageReport) => {
    showAlert('Dismiss this report?', 'No action will be taken against the user.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        onPress: async () => {
          try {
            await resolveReport.mutateAsync(report.id);
          } catch (err) {
            showAlert("Couldn't dismiss report", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => query.refetch()}>
      <SectionHeader
        eyebrow="Admin"
        title="Reported messages"
        description="Review flagged content and block accounts that violate WebNest Studio's policies."
      />

      {query.isLoading ? (
        <LoadingView label="Loading reports" />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={() => query.refetch()} />
      ) : reports.length === 0 ? (
        <EmptyView message="No open reports. Nothing to review right now." />
      ) : (
        <View style={styles.list}>
          {reports.map(report => (
            <Card key={report.id} variant="elevated" style={styles.card}>
              <View style={styles.rowTop}>
                <View style={styles.flex1}>
                  <Text variant="rowTitle" numberOfLines={1}>
                    {report.reported_user.full_name || report.reported_user.email}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    Reported by {report.reporter.full_name || report.reporter.email} ·{' '}
                    {formatDate(report.created_at)}
                  </Text>
                </View>
                <Badge label="Open" tone="gold" />
              </View>

              <Text variant="caption" tone="secondary" style={styles.reason}>
                Reason: {report.reason}
              </Text>

              <Text variant="body" tone={report.message_deleted ? 'tertiary' : 'secondary'} numberOfLines={3}>
                {report.message_deleted ? 'This message has since been deleted.' : report.message_preview || '(no text — attachment only)'}
              </Text>

              <View style={styles.actions}>
                <Button
                  title="Dismiss"
                  variant="outline"
                  disabled={busy}
                  onPress={() => confirmDismiss(report)}
                  style={styles.actionBtn}
                />
                <Button
                  title="Block user"
                  variant="primary"
                  disabled={busy}
                  onPress={() => confirmBlock(report)}
                  style={styles.actionBtn}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    gap: spacing.sm,
  },
  rowTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
    gap: 2,
  },
  reason: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});

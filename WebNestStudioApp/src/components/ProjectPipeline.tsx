import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import type { ProjectStage } from '../types/api';
import { formatDate } from '../utils/format';
import { Text } from './Text';

type Props = {
  stages: ProjectStage[];
  /** 'full' = vertical stepper with notes/dates; 'compact' = a row of dots. */
  variant?: 'full' | 'compact';
};

/**
 * Presentational only — pure theme tokens, no data fetching. Tolerates a short,
 * out-of-order, or empty `stages` array without throwing.
 */
export function ProjectPipeline({ stages, variant = 'full' }: Props) {
  const ordered = Array.isArray(stages)
    ? stages
        .filter(s => s && typeof s === 'object')
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  if (ordered.length === 0) {
    return (
      <Text variant="caption" tone="tertiary">
        The pipeline will appear once WebNest sets up the project.
      </Text>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.dots}>
        {ordered.map((s, i) => (
          <View
            key={s.key ?? i}
            style={[
              styles.dot,
              s.state === 'done' && styles.dotDone,
              s.state === 'in_progress' && styles.dotDoing,
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {ordered.map((s, i) => (
        <PipelineRow key={s.key ?? i} stage={s} isLast={i === ordered.length - 1} />
      ))}
    </View>
  );
}

function PipelineRow({ stage, isLast }: { stage: ProjectStage; isLast: boolean }) {
  const done = stage.state === 'done';
  const doing = stage.state === 'in_progress';
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!doing) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [doing, pulse]);

  const meta = done
    ? stage.completed_at
      ? `Completed ${formatDate(stage.completed_at)}`
      : 'Completed'
    : doing
    ? stage.started_at
      ? `Started ${formatDate(stage.started_at)}`
      : 'In progress'
    : 'Upcoming';

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {doing ? (
          <Animated.View style={[styles.node, styles.nodeDoing, { opacity: pulse }]} />
        ) : done ? (
          <View style={[styles.node, styles.nodeDone]}>
            <Icon name="check" size={12} color={colors.textOnGold} />
          </View>
        ) : (
          <View style={[styles.node, styles.nodePending]} />
        )}
        {!isLast ? (
          <View style={[styles.connector, done && styles.connectorDone]} />
        ) : null}
      </View>

      <View style={styles.body}>
        <Text variant="rowTitle" tone={done || doing ? 'primary' : 'tertiary'}>
          {stage.label || 'Stage'}
        </Text>
        <Text variant="caption" tone="tertiary">
          {meta}
        </Text>
        {stage.note ? (
          <Text variant="caption" tone="secondary" style={styles.note}>
            {stage.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const NODE = 22;

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: NODE,
  },
  node: {
    alignItems: 'center',
    borderRadius: NODE / 2,
    height: NODE,
    justifyContent: 'center',
    width: NODE,
  },
  nodeDone: {
    backgroundColor: colors.goldFill,
  },
  nodeDoing: {
    backgroundColor: 'transparent',
    borderColor: colors.goldPrimary,
    borderWidth: 2,
  },
  nodePending: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
  },
  connector: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    flex: 1,
    marginVertical: 2,
    minHeight: NODE,
    width: 2,
  },
  connectorDone: {
    backgroundColor: colors.goldFill,
  },
  body: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.md,
  },
  note: {
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotDone: {
    backgroundColor: colors.goldFill,
  },
  dotDoing: {
    backgroundColor: colors.goldPrimary,
  },
});

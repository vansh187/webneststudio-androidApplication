import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import {
  CONTACT,
  FOUNDER,
  FOUNDER_VISION,
  GOALS,
  SCOPE,
  STORY_MARKERS,
  VISION,
} from '../data/content';
import { colors } from '../theme/colors';
import { radii, shadow, spacing } from '../theme/spacing';

const FOUNDER_IMG = require('../assets/founder.jpg');

export function StoryScreen() {
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={styles.hero}>
        <Badge label="Our Story" />
        <Text variant="title">
          Growing WebNest Studio into a premium digital house for modern brands.
        </Text>

        <View style={styles.portraitFrame}>
          <Image source={FOUNDER_IMG} style={styles.portrait} resizeMode="cover" />
          <View style={styles.portraitCaption}>
            <View style={styles.flex1}>
              <Text variant="rowTitle">{FOUNDER.name}</Text>
              <Text variant="caption" tone="gold" style={styles.captionKicker}>
                {FOUNDER.role}
              </Text>
            </View>
            <View style={styles.monogram}>
              <Text variant="caption" tone="gold" style={styles.monogramText}>
                VD
              </Text>
            </View>
          </View>
        </View>

        <Text variant="lead">
          We are building the digital reputation, growth systems, and technology foundation that help
          ambitious businesses look sharper, move faster, and earn trust from the first impression.
        </Text>
        <Button title="Build with us" icon="arrow-right" onPress={() => Linking.openURL(CONTACT.whatsappHref)} />
      </View>

      <Divider />

      <Badge label={FOUNDER_VISION.eyebrow} />
      <Text variant="sectionTitle" style={styles.mt}>
        {FOUNDER_VISION.statement}
      </Text>
      <View style={styles.quote}>
        <Text variant="body">{FOUNDER_VISION.body}</Text>
        <Text variant="label" tone="gold" style={styles.mt}>
          {FOUNDER_VISION.attribution}
        </Text>
      </View>

      <View style={styles.stack}>
        {STORY_MARKERS.map(item => (
          <Card key={item.title}>
            <Text variant="label" tone="gold">
              {item.label}
            </Text>
            <Text variant="rowTitle" style={styles.mtSm}>
              {item.title}
            </Text>
            <Text variant="muted" style={styles.mtSm}>
              {item.body}
            </Text>
          </Card>
        ))}
      </View>

      <Divider />

      <Badge label="Our Scope" />
      <Text variant="sectionTitle" style={styles.mt}>
        The services premium brands need after launch.
      </Text>
      <View style={styles.scopeGrid}>
        {SCOPE.map(item => (
          <Card key={item.title} style={styles.scopeCard}>
            <View style={styles.scopeIcon}>
              <Icon name={item.icon} size={18} color={colors.goldPrimary} />
            </View>
            <Text variant="bodyStrong" tone="primary" style={styles.mtSm}>
              {item.title}
            </Text>
            <Text variant="caption" tone="tertiary" style={styles.mtSm}>
              {item.body}
            </Text>
          </Card>
        ))}
      </View>

      <Divider />

      <Badge label="Our Goals" />
      <Text variant="sectionTitle" style={styles.mt}>
        Growth with taste, technology, and long-term trust.
      </Text>
      <View style={styles.stack}>
        {GOALS.map((goal, i) => (
          <View key={goal} style={styles.goalRow}>
            <Text variant="rowTitle" tone="gold">
              0{i + 1}
            </Text>
            <Text variant="body" style={styles.flex1}>
              {goal}
            </Text>
          </View>
        ))}
      </View>

      <Card variant="gold" style={styles.visionCard}>
        <Icon name="compass" size={22} color={colors.goldPrimary} />
        <Text variant="label" tone="gold" style={styles.mt}>
          {VISION.eyebrow}
        </Text>
        <Text variant="sectionTitle" center style={styles.mtSm}>
          {VISION.statement}
        </Text>
        <Text variant="body" center style={styles.mtSm}>
          {VISION.body}
        </Text>
        <Button
          title="Start a project"
          icon="arrow-right"
          style={styles.mt}
          onPress={() => navigation.navigate('Contact')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  portraitFrame: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderAccent,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
    ...shadow.card,
  },
  portrait: {
    // Asset is pre-cropped to a centred head-and-shoulders band (420x240).
    // Matching that ratio here means no further cropping — the whole frame
    // shows, contained cleanly, as a slim premium strip.
    aspectRatio: 420 / 240,
    width: '100%',
  },
  portraitCaption: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  captionKicker: {
    marginTop: 3,
  },
  monogram: {
    alignItems: 'center',
    borderColor: colors.borderAccent,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  monogramText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  mt: { marginTop: spacing.md },
  mtSm: { marginTop: spacing.xs },
  quote: {
    borderLeftColor: colors.goldPrimary,
    borderLeftWidth: 2,
    marginTop: spacing.md,
    paddingLeft: spacing.md,
  },
  stack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scopeCard: {
    minWidth: '46%',
    flex: 1,
  },
  scopeIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGold,
    borderRadius: radii.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  goalRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flex1: { flex: 1 },
  visionCard: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
});

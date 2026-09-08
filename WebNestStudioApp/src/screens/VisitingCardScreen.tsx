import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { VisitingCard, VisitingCardShareable } from '../components/VisitingCard';
import { BRAND, CONTACT, FOUNDER } from '../data/content';
import { spacing } from '../theme/spacing';

const GREETING = [
  '✨  WebNest Studio — Where Brands Go Digital.',
  '',
  `${FOUNDER.name} · ${FOUNDER.role}`,
  `🌐  ${BRAND.site}`,
  `✉️  ${CONTACT.email}`,
  `📞  ${CONTACT.phone}`,
  '',
  "Here's our visiting card — let's build something premium together.",
].join('\n');

export function VisitingCardScreen() {
  const shotRef = useRef<React.ElementRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async () => {
    setSharing(true);
    try {
      // Two captures: the first can miss on a view that just mounted.
      let uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      if (!uri) {
        uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      }
      await Share.open({
        title: 'WebNest Studio · Visiting Card',
        message: GREETING,
        url: uri.startsWith('file://') || uri.startsWith('data:') ? uri : `file://${uri}`,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? '');
      if (/cancel|dismiss/i.test(message)) {
        return;
      }
      // Fall back to a text-only share so the action still does something useful.
      try {
        await Share.open({ title: 'WebNest Studio', message: GREETING, failOnCancel: false });
      } catch {
        Alert.alert('Could not share', 'Please try again.');
      }
    } finally {
      setSharing(false);
    }
  }, []);

  return (
    <Screen style={styles.content}>
      <View style={styles.top}>
        <Badge label="Visiting card" />
        <Text variant="title" center>
          WebNest Studio
        </Text>
        <Text variant="body" center>
          Front and back — tap the card to flip it.
        </Text>
      </View>

      <View style={styles.cardArea}>
        <VisitingCard autoFlip />
      </View>

      <Button title="Share visiting card" icon="share-2" loading={sharing} onPress={share} />

      <Card variant="gold" style={styles.greetingCard}>
        <Text variant="label" tone="gold">
          Message that goes with it
        </Text>
        <Text variant="muted">{GREETING}</Text>
      </Card>

      {/* Rendered (so it can be snapshotted) but visually hidden behind the
          content — this stacked front+back is what gets captured & shared. */}
      <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
        <VisitingCardShareable shotRef={shotRef} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  top: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardArea: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  greetingCard: {
    gap: spacing.xs,
  },
  offscreen: {
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { CONTACT, FOUNDER } from '../data/content';
import { gold } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { font } from '../theme/typography';
import { Text } from './Text';

const MARK = require('../assets/logo.png');

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 196;

const CARD_INK = '#0A0A09';

/* -------------------------------------------------------------- Card faces --- */

function CornerArcs() {
  return (
    <>
      <View pointerEvents="none" style={[styles.arc, styles.arcTopLeft]} />
      <View pointerEvents="none" style={[styles.arc, styles.arcBottomRight]} />
    </>
  );
}

export function CardFront() {
  return (
    <View style={styles.face}>
      <CornerArcs />
      <Image source={MARK} style={styles.frontMark} resizeMode="contain" />
    </View>
  );
}

function DetailRow({ icon, label, sub }: { icon: string; label: string; sub?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={11} color={gold[300]} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function CardBack() {
  return (
    <View style={[styles.face, styles.backFace]}>
      <CornerArcs />
      <Image source={MARK} style={styles.backMark} resizeMode="contain" />
      <View style={styles.backDivider} />
      <View style={styles.backDetails}>
        <Text style={styles.backWordmark}>
          WEBNEST <Text style={styles.backWordmarkGold}>STUDIO</Text>
        </Text>
        <Text style={styles.backTagline}>WHERE BRANDS GO DIGITAL</Text>
        <View style={styles.rows}>
          <DetailRow icon="globe" label="webneststudio.co.in" />
          <DetailRow icon="user" label={FOUNDER.name.toUpperCase()} sub="FOUNDER" />
          <DetailRow icon="mail" label={CONTACT.email} />
          <DetailRow icon="phone" label={CONTACT.phone} />
        </View>
      </View>
    </View>
  );
}

/* --------------------------------------------------- Interactive flip card --- */

type FlipProps = {
  autoFlip?: boolean;
  intervalMs?: number;
};

export function VisitingCard({ autoFlip = true, intervalMs = 4500 }: FlipProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const pausedUntil = useRef(0);

  // Single source of truth: whenever `flipped` changes, run one deterministic
  // 550ms turn. No animation is ever started from inside a state updater.
  useEffect(() => {
    Animated.timing(spin, {
      toValue: flipped ? 1 : 0,
      duration: 550,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flipped, spin]);

  useEffect(() => {
    if (!autoFlip) {
      return;
    }
    const id = setInterval(() => {
      if (Date.now() >= pausedUntil.current) {
        setFlipped(f => !f);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoFlip, intervalMs]);

  const onTap = useCallback(() => {
    pausedUntil.current = Date.now() + 7000;
    setFlipped(f => !f);
  }, []);

  const frontRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <Pressable onPress={onTap} style={styles.flipWrap}>
      <Animated.View
        style={[styles.flipFace, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}>
        <CardFront />
      </Animated.View>
      <Animated.View
        style={[styles.flipFace, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}>
        <CardBack />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------- Static stacked capture (for sharing) --- */

type ViewInstance = React.ElementRef<typeof View>;

export function VisitingCardShareable({ shotRef }: { shotRef: React.Ref<ViewInstance> }) {
  return (
    <View ref={shotRef} collapsable={false} style={styles.shareable}>
      <CardFront />
      <View style={styles.shareableGap} />
      <CardBack />
    </View>
  );
}

/* ------------------------------------------------------------------ styles --- */

const styles = StyleSheet.create({
  flipWrap: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
  },
  flipFace: {
    backfaceVisibility: 'hidden',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  shareable: {
    backgroundColor: CARD_INK,
    padding: spacing.md,
  },
  shareableGap: {
    height: spacing.md,
  },

  face: {
    alignItems: 'center',
    backgroundColor: CARD_INK,
    borderColor: 'rgba(230,172,62,0.35)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    width: CARD_WIDTH,
  },
  backFace: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.md,
  },

  frontMark: {
    height: CARD_HEIGHT * 0.82,
    width: CARD_WIDTH * 0.82,
  },
  backMark: {
    height: 72,
    width: 72,
  },
  backDivider: {
    backgroundColor: 'rgba(230,172,62,0.45)',
    height: '68%',
    width: 1,
  },
  backDetails: {
    flex: 1,
    gap: 2,
  },
  backWordmark: {
    color: '#F6F7F9',
    fontFamily: font.display,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
  },
  backWordmarkGold: {
    color: gold[400],
  },
  backTagline: {
    color: gold[300],
    fontFamily: font.display,
    fontSize: 6.5,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  rows: {
    gap: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rowIcon: {
    alignItems: 'center',
    borderColor: 'rgba(230,172,62,0.5)',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: '#ECEDEF',
    fontFamily: font.sans,
    fontSize: 10.5,
    fontWeight: '600',
  },
  rowSub: {
    color: gold[300],
    fontFamily: font.display,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  arc: {
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 5,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  arcTopLeft: {
    borderLeftColor: gold[600],
    borderTopColor: gold[400],
    left: -150,
    top: -150,
    transform: [{ rotate: '18deg' }],
  },
  arcBottomRight: {
    borderBottomColor: gold[400],
    borderRightColor: gold[600],
    bottom: -150,
    right: -150,
    transform: [{ rotate: '18deg' }],
  },
});

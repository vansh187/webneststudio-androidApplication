import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/Feather';

import { InlineSpan, MarkdownBlock, parseInline, parseMarkdown } from '../../features/assistant/markdown';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { openExternal } from '../../utils/linking';
import { Text } from '../Text';

const MONO = 'monospace';
const COPIED_MS = 1500;

function Inline({ text }: { text: string }) {
  const spans = useMemo(() => parseInline(text), [text]);
  return <>{spans.map((span, index) => renderSpan(span, index))}</>;
}

function renderSpan(span: InlineSpan, key: number) {
  switch (span.type) {
    case 'bold':
      return (
        <Text key={key} variant="bodyStrong" tone="primary">
          {span.text}
        </Text>
      );
    case 'italic':
      return (
        <Text key={key} tone="primary" style={styles.italic}>
          {span.text}
        </Text>
      );
    case 'code':
      return (
        <Text key={key} tone="gold" style={styles.inlineCode}>
          {span.text}
        </Text>
      );
    case 'link':
      // AI-written text: only ever open plain web links from it.
      return /^https:\/\//i.test(span.url) ? (
        <Text
          key={key}
          tone="gold"
          style={styles.link}
          accessibilityRole="link"
          onPress={() => openExternal(span.url)}>
          {span.text}
        </Text>
      ) : (
        <Text key={key} tone="primary">
          {span.text}
        </Text>
      );
    default:
      return (
        <Text key={key} tone="primary">
          {span.text}
        </Text>
      );
  }
}

function CodeBlock({ language, path, code }: { language: string | null; path: string | null; code: string }) {
  const [copied, setCopied] = useState(false);
  const label = [language, path].filter(Boolean).join(' · ');

  const copy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHead}>
        <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.codeLabel}>
          {label || 'code'}
        </Text>
        <Pressable
          onPress={copy}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Copy code"
          style={styles.copy}>
          <Icon name={copied ? 'check' : 'copy'} size={13} color={colors.goldPrimary} />
          <Text variant="caption" tone="gold">
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text selectable style={styles.code}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text variant={block.level <= 2 ? 'rowTitle' : 'bodyStrong'} tone="primary">
          <Inline text={block.text} />
        </Text>
      );
    case 'bullet':
    case 'number':
      return (
        <View style={[styles.listRow, { marginLeft: Math.min(block.indent, 8) * 4 }]}>
          <Text tone="gold" style={styles.listMarker}>
            {block.type === 'bullet' ? '•' : block.marker}
          </Text>
          <Text selectable tone="primary" style={styles.listText}>
            <Inline text={block.text} />
          </Text>
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text selectable tone="secondary">
            <Inline text={block.text} />
          </Text>
        </View>
      );
    case 'rule':
      return <View style={styles.rule} />;
    case 'code':
      return <CodeBlock language={block.language} path={block.path} code={block.code} />;
    default:
      return (
        <Text selectable tone="primary">
          <Inline text={block.text} />
        </Text>
      );
  }
}

function MarkdownMessageView({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </View>
  );
}

export const MarkdownMessage = memo(MarkdownMessageView);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    backgroundColor: colors.surfaceGold,
    fontFamily: MONO,
    fontSize: 13,
  },
  link: {
    textDecorationLine: 'underline',
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  listMarker: {
    minWidth: 14,
  },
  listText: {
    flex: 1,
  },
  quote: {
    borderLeftColor: colors.borderAccent,
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
  },
  rule: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth * 2,
  },
  codeBlock: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  codeHead: {
    alignItems: 'center',
    borderBottomColor: colors.hairline,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  codeLabel: {
    flex: 1,
  },
  copy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  code: {
    color: colors.textPrimary,
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.sm,
  },
});

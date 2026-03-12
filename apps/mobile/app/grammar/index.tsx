import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence, withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { ChevronLeft, Lock, Check, Play, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import {
  ALL_LESSONS, LESSONS_BY_LEVEL, LEVEL_COLORS, LEVEL_DESCRIPTIONS,
  type GrammarLevel, type GrammarLesson,
} from '@/src/data/grammar';

/* ─── Layout constants ────────────────────────────────────────── */

const { width }     = Dimensions.get('window');
const NODE_R        = 28;
const V_STEP        = 172;
const HEADER_H      = 76;   // vertical gap reserved for each level divider
const PAD_TOP       = 20;
const COMPLETED_KEY = '@vocally/grammarCompleted';
const LEVELS: GrammarLevel[] = ['A2', 'B1', 'B2', 'C1', 'C2'];

// Left ↔ right winding
const X_LEFT  = width * 0.28;
const X_RIGHT = width * 0.72;
const X_PAT   = [X_LEFT, X_RIGHT];

/* ─── Types ───────────────────────────────────────────────────── */

type NodeState = 'completed' | 'current' | 'locked';

interface LessonNode {
  lesson:      GrammarLesson;
  x:           number;
  y:           number;
  globalIndex: number;
  state:       NodeState;
}

interface LevelHeader {
  level:            GrammarLevel;
  y:                number;   // top of this level's reserved space
  completedInLevel: number;
  totalInLevel:     number;
}

/* ─── Build layout ────────────────────────────────────────────── */

function buildLayout(completedIds: Set<string>) {
  const nodes:   LessonNode[]   = [];
  const headers: LevelHeader[]  = [];
  let y            = PAD_TOP;
  let globalIndex  = 0;
  let foundCurrent = false;

  for (const level of LEVELS) {
    const levelLessons     = LESSONS_BY_LEVEL[level];
    const completedInLevel = levelLessons.filter((l) => completedIds.has(l.id)).length;

    headers.push({ level, y, completedInLevel, totalInLevel: levelLessons.length });
    y += HEADER_H;

    for (const lesson of levelLessons) {
      const x = X_PAT[globalIndex % 2];

      let state: NodeState;
      if (completedIds.has(lesson.id)) {
        state = 'completed';
      } else if (!foundCurrent) {
        state = 'current';
        foundCurrent = true;
      } else {
        state = 'locked';
      }

      nodes.push({ lesson, x, y, globalIndex, state });
      y += V_STEP;
      globalIndex++;
    }
    y += 24;   // extra gap after each level's last node
  }

  return { nodes, headers, totalHeight: y + 60 };
}

/* ─── SVG path ────────────────────────────────────────────────── */

function buildPath(nodes: LessonNode[]) {
  return nodes.map((node, i) => {
    if (i === 0) return `M ${node.x} ${node.y}`;
    const prev = nodes[i - 1];
    const midY = (prev.y + node.y) / 2;
    return `C ${prev.x} ${midY} ${node.x} ${midY} ${node.x} ${node.y}`;
  }).join(' ');
}

/* ─── Lesson node ─────────────────────────────────────────────── */

function LessonDot({
  node, onPress, t, delay,
}: {
  node:    LessonNode;
  onPress: () => void;
  t:       ReturnType<typeof useTheme>;
  delay:   number;
}) {
  const color      = LEVEL_COLORS[node.lesson.level];
  const scale      = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseAlpha = useSharedValue(0.35);

  useEffect(() => {
    if (node.state === 'current') {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.6, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1, true,
      );
      pulseAlpha.value = withRepeat(
        withSequence(withTiming(0, { duration: 1200 }), withTiming(0.35, { duration: 1200 })),
        -1, true,
      );
    }
  }, []);

  const dotStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   pulseAlpha.value,
  }));

  const isLocked    = node.state === 'locked';
  const isCompleted = node.state === 'completed';
  const isCurrent   = node.state === 'current';

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300)}
      style={[styles.nodeWrap, { left: node.x - NODE_R, top: node.y - NODE_R }, dotStyle]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { if (!isLocked) scale.value = withSpring(0.88); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
        disabled={isLocked}
      >
        {/* Pulse ring */}
        {isCurrent && (
          <Animated.View style={[styles.pulseRing, { backgroundColor: color }, ringStyle]} />
        )}
        {/* Static border ring */}
        {isCurrent && (
          <View style={[styles.staticRing, { borderColor: color }]} />
        )}

        {/* Main circle */}
        <View style={[
          styles.nodeDot,
          isLocked
            ? { backgroundColor: t.subtle, borderWidth: 2, borderColor: t.border }
            : {
                backgroundColor: color,
                shadowColor: color,
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 5,
              },
        ]}>
          {isCompleted && <Check size={17} color="#fff" strokeWidth={3} />}
          {isCurrent   && <Play  size={15} color="#fff" strokeWidth={0} fill="#fff" />}
          {isLocked    && (
            <Text style={[styles.stepNum, { color: t.muted }]}>
              {node.globalIndex + 1}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Level divider ───────────────────────────────────────────── */

function LevelDivider({
  header, t,
}: {
  header: LevelHeader;
  t:      ReturnType<typeof useTheme>;
}) {
  const color   = LEVEL_COLORS[header.level];
  const isDone  = header.completedInLevel === header.totalInLevel;
  // Vertically centered within the HEADER_H slot
  const centerY = header.y + HEADER_H / 2;

  return (
    <View
      style={[
        styles.dividerRow,
        { top: centerY - 14 },   // 14 = half of pill height (≈28px)
      ]}
    >
      {/* Left line */}
      <View style={[styles.dividerLine, { backgroundColor: t.border }]} />

      {/* Centre pill */}
      <View style={[styles.dividerPill, { backgroundColor: color }]}>
        <Text style={styles.dividerPillLevel}>{header.level}</Text>
        <View style={styles.dividerDot} />
        <Text style={styles.dividerPillCount}>
          {header.completedInLevel}/{header.totalInLevel}
        </Text>
        {isDone && <Check size={10} color="#fff" strokeWidth={3} style={{ marginLeft: 2 }} />}
      </View>

      {/* Right line */}
      <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
    </View>
  );
}

/* ─── Topic label ─────────────────────────────────────────────── */

function TopicLabel({ node, t }: { node: LessonNode; t: ReturnType<typeof useTheme> }) {
  const isLeft   = node.x < width * 0.5;
  const isLocked = node.state === 'locked';
  const color    = LEVEL_COLORS[node.lesson.level];

  const posStyle = isLeft
    ? { left: node.x + NODE_R + 14, top: node.y - 19 }
    : { right: width - node.x + NODE_R + 14, top: node.y - 19, alignItems: 'flex-end' as const };

  return (
    <View style={[styles.topicLabel, posStyle]}>
      <Text
        style={[styles.topicTitle, { color: isLocked ? t.muted : t.fg }]}
        numberOfLines={2}
      >
        {node.lesson.topic}
      </Text>
      {!isLocked && (
        <View style={[styles.levelTag, { borderColor: `${color}55` }]}>
          <Text style={[styles.levelTagText, { color }]}>{node.lesson.level}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Screen ──────────────────────────────────────────────────── */

export default function GrammarRoadmapScreen() {
  const t      = useTheme();
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [ready,        setReady]        = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(COMPLETED_KEY).then((raw) => {
        if (raw) {
          try { setCompletedIds(new Set(JSON.parse(raw))); } catch {}
        }
        setReady(true);
      });
    }, [])
  );

  const { nodes, headers, totalHeight } = buildLayout(completedIds);
  const pathD = buildPath(nodes);

  const segmentPaths = nodes.slice(1).map((node, i) => {
    const prev = nodes[i];
    const midY = (prev.y + node.y) / 2;
    return {
      d:    `M ${prev.x} ${prev.y} C ${prev.x} ${midY} ${node.x} ${midY} ${node.x} ${node.y}`,
      done: prev.state === 'completed',
      col:  LEVEL_COLORS[node.lesson.level],
    };
  });

  const completedCount = completedIds.size;
  const totalCount     = ALL_LESSONS.length;
  const pct            = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const currentNode    = nodes.find((n) => n.state === 'current');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={t.fg} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.fg }]}>Grammar Path</Text>
          <Text style={[styles.headerSub, { color: t.muted }]}>
            {completedCount} of {totalCount} complete
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: t.subtle }]}>
        <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${pct}%` }]} />
      </View>

      {ready && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ height: totalHeight }}
        >
          <View style={{ width, height: totalHeight }}>

            {/* SVG path */}
            <Svg
              width={width}
              height={totalHeight}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <SvgPath
                d={pathD}
                stroke={t.dark ? '#2c2c2c' : '#dedede'}
                strokeWidth={4}
                strokeDasharray="6 8"
                strokeLinecap="round"
                fill="none"
              />
              {segmentPaths.map((seg, i) =>
                seg.done ? (
                  <SvgPath
                    key={i}
                    d={seg.d}
                    stroke={seg.col}
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null
              )}
            </Svg>

            {/* Level dividers */}
            {headers.map((h) => (
              <LevelDivider key={h.level} header={h} t={t} />
            ))}

            {/* Topic labels */}
            {nodes.map((node) => (
              <TopicLabel key={node.lesson.id} node={node} t={t} />
            ))}

            {/* Node circles */}
            {nodes.map((node, i) => (
              <LessonDot
                key={node.lesson.id}
                node={node}
                t={t}
                delay={i * 35}
                onPress={() => router.push(`/grammar/${node.lesson.id}`)}
              />
            ))}

          </View>
        </ScrollView>
      )}

      {/* Continue button */}
      {ready && currentNode && (
        <View style={[styles.continueBar, { borderTopColor: t.border, backgroundColor: t.bg }]}>
          <Pressable
            style={[styles.continueBtn, { backgroundColor: LEVEL_COLORS[currentNode.lesson.level] }]}
            onPress={() => router.push(`/grammar/${currentNode.lesson.id}`)}
          >
            <Play size={14} color="#fff" fill="#fff" strokeWidth={0} />
            <Text style={styles.continueBtnText} numberOfLines={1}>
              {currentNode.lesson.topic}
            </Text>
            <ChevronRight size={16} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn:      { width: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontFamily: F.bold },
  headerSub:    { fontSize: 11, fontFamily: F.medium, marginTop: 1 },

  progressTrack: { height: 3 },
  progressFill:  { height: 3 },

  /* Node */
  nodeWrap: {
    position: 'absolute',
    width: NODE_R * 2, height: NODE_R * 2,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeDot: {
    width: NODE_R * 2, height: NODE_R * 2,
    borderRadius: NODE_R,
    alignItems: 'center', justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: NODE_R * 2, height: NODE_R * 2,
    borderRadius: NODE_R,
    top: 0, left: 0,
  },
  staticRing: {
    position: 'absolute',
    width: NODE_R * 2 + 14, height: NODE_R * 2 + 14,
    borderRadius: NODE_R + 7,
    borderWidth: 2,
    top: -7, left: -7,
    opacity: 0.5,
  },
  stepNum: { fontSize: 13, fontFamily: F.bold },

  /* Divider */
  dividerRow: {
    position: 'absolute',
    left: 20, right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1, height: 1,
  },
  dividerPill: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  dividerPillLevel: {
    color: '#fff', fontSize: 12, fontFamily: F.extrabold, letterSpacing: 0.5,
  },
  dividerDot: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dividerPillCount: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: F.semibold,
  },

  /* Topic label */
  topicLabel: {
    position: 'absolute',
    width: width * 0.38,
    gap: 4,
  },
  topicTitle: {
    fontSize: 12, fontFamily: F.semibold, lineHeight: 17,
  },
  levelTag: {
    alignSelf: 'flex-start',
    borderRadius: 4, borderWidth: 1,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  levelTagText: {
    fontSize: 9, fontFamily: F.bold, letterSpacing: 0.4,
  },

  /* Continue bar */
  continueBar: {
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
  },
  continueBtnText: {
    flex: 1, fontSize: 14, fontFamily: F.bold, color: '#fff',
  },
});

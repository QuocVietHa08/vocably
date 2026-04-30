import React, {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef,
} from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { F } from '@/src/theme/fonts';
import { FlashCard, type FlashCardRef } from './FlashCard';
import type { Flashcard } from '@/src/data/flashcards';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.18;
const FLICK_VELOCITY  = 500;
const CARD_H = 420;
const MAX_VISIBLE = 3;

export interface SwipeDeckHandle {
  swipeLeft:  () => void;
  swipeRight: () => void;
  flip:       () => void;
}

interface SwipeDeckProps {
  cards: Flashcard[];
  onSwipe: (card: Flashcard, direction: 'left' | 'right') => void;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: () => void;
}

export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(function SwipeDeck({
  cards,
  onSwipe,
  isFavorite,
  onToggleFavorite,
}, ref) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const topCardRef = useRef<FlashCardRef>(null);

  // Top-of-stack card id — drives reset effect
  const topId = cards[0]?.id ?? null;

  // Reset position whenever top card changes (parent consumed a swipe)
  useEffect(() => {
    console.log('[SwipeDeck] top card changed:', topId);
    translateX.value = 0;
    translateY.value = 0;
  }, [topId]);

  // Fly the top card off-screen, then notify parent
  const commitSwipe = useCallback((direction: 'left' | 'right') => {
    const top = cards[0];
    if (!top) return;
    console.log('[SwipeDeck] commitSwipe:', direction, top.id);
    onSwipe(top, direction);
  }, [cards, onSwipe]);

  const flyOut = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetX = direction === 'right' ? SCREEN_W * 1.6 : -SCREEN_W * 1.6;
    translateX.value = withTiming(
      targetX,
      { duration: 280, easing: Easing.out(Easing.cubic) },
      (done) => {
        if (done) runOnJS(commitSwipe)(direction);
      },
    );
    translateY.value = withTiming(-CARD_H * 0.12, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [commitSwipe, translateX, translateY]);

  // Pan gesture — only the top card responds
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .onStart(() => {
          runOnJS(console.log)('[SwipeDeck] pan start');
        })
        .onUpdate((e) => {
          translateX.value = e.translationX;
          translateY.value = e.translationY * 0.12;
        })
        .onEnd((e) => {
          const isRightFlick = e.velocityX >  FLICK_VELOCITY && e.translationX >  10;
          const isLeftFlick  = e.velocityX < -FLICK_VELOCITY && e.translationX < -10;
          if      (e.translationX >  SWIPE_THRESHOLD || isRightFlick) runOnJS(flyOut)('right');
          else if (e.translationX < -SWIPE_THRESHOLD || isLeftFlick)  runOnJS(flyOut)('left');
          else {
            translateX.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [flyOut, translateX, translateY],
  );

  // Imperative handle
  useImperativeHandle(ref, () => ({
    swipeRight: () => flyOut('right'),
    swipeLeft:  () => flyOut('left'),
    flip:       () => topCardRef.current?.flipCard(),
  }), [flyOut]);

  // Top card transform — drag position + tilt
  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-14, 14])}deg` },
    ],
    zIndex: 3,
  }));

  // Back card 1 (depth 1) — rises toward top as drag progresses
  const backStyle1 = useAnimatedStyle(() => {
    const progress = interpolate(
      Math.abs(translateX.value), [0, SCREEN_W * 0.4], [0, 1], 'clamp',
    );
    return {
      transform: [
        { translateY: interpolate(progress, [0, 1], [10, 0]) },
        { scale:      interpolate(progress, [0, 1], [0.96, 1.0]) },
      ],
      opacity: interpolate(progress, [0, 1], [0.92, 1.0]),
      zIndex: 2,
    };
  });

  // Back card 2 (depth 2) — rises toward depth 1 values
  const backStyle2 = useAnimatedStyle(() => {
    const progress = interpolate(
      Math.abs(translateX.value), [0, SCREEN_W * 0.4], [0, 1], 'clamp',
    );
    return {
      transform: [
        { translateY: interpolate(progress, [0, 1], [20, 10]) },
        { scale:      interpolate(progress, [0, 1], [0.92, 0.96]) },
      ],
      opacity: interpolate(progress, [0, 1], [0.85, 0.92]),
      zIndex: 1,
    };
  });

  // Overlay label styles (KNOW / AGAIN) — fade in based on drag
  const knowLabelStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [20, 90], [0, 1], 'clamp');
    return {
      opacity: p,
      transform: [
        { scale: interpolate(p, [0, 1], [0.6, 1]) },
        { rotate: '12deg' },
      ],
    };
  });
  const dontKnowLabelStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [-20, -90], [0, 1], 'clamp');
    return {
      opacity: p,
      transform: [
        { scale: interpolate(p, [0, 1], [0.6, 1]) },
        { rotate: '-12deg' },
      ],
    };
  });

  if (cards.length === 0) return null;

  // Render deepest → top so React stacking aligns with zIndex (belt + suspenders)
  const visible = cards.slice(0, MAX_VISIBLE);
  const renderOrder = [...visible].reverse();

  return (
    <View style={styles.deck}>
      {renderOrder.map((card) => {
        const depth = visible.indexOf(card); // 0 = top
        const isTop = depth === 0;

        if (isTop) {
          return (
            <GestureDetector key={card.id} gesture={panGesture}>
              <Animated.View style={[styles.cardSlot, topCardStyle]}>
                <FlashCard
                  ref={topCardRef}
                  card={card}
                  draggable={false}
                  isFavorite={isFavorite?.(card.id) ?? false}
                  onToggleFavorite={onToggleFavorite}
                  onKnow={() => {}}
                  onDontKnow={() => {}}
                />

                {/* Swipe overlay labels — deck-owned */}
                <Animated.View
                  style={[styles.label, styles.knowLabel, knowLabelStyle]}
                  pointerEvents="none"
                >
                  <Text style={styles.knowText}>KNOW ✓</Text>
                </Animated.View>
                <Animated.View
                  style={[styles.label, styles.dontKnowLabel, dontKnowLabelStyle]}
                  pointerEvents="none"
                >
                  <Text style={styles.dontKnowText}>AGAIN ↺</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          );
        }

        const depthStyle = depth === 1 ? backStyle1 : backStyle2;
        return (
          <Animated.View
            key={card.id}
            style={[styles.cardSlot, depthStyle]}
            pointerEvents="none"
          >
            <FlashCard
              card={card}
              draggable={false}
              isFavorite={false}
              onKnow={() => {}}
              onDontKnow={() => {}}
            />
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  deck: {
    width: '100%',
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 22,
    zIndex: 20,
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  knowLabel:     { right: 40, borderColor: '#22c55e' },
  dontKnowLabel: { left: 40,  borderColor: '#ef4444' },
  knowText:      { color: '#22c55e', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
  dontKnowText:  { color: '#ef4444', fontFamily: F.extrabold, fontSize: 13, letterSpacing: 0.5 },
});

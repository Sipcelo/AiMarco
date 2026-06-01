import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { palette, radius, spacing, shadow, typography } from '../../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Conteúdo scrollável (default true). */
  scroll?: boolean;
}

const SCREEN_H = Dimensions.get('window').height;

/**
 * Bottom sheet leve baseado em Modal + Animated, sem dependências nativas.
 * - Anima entrada (slide-up + fade do backdrop) e saída.
 * - Handle arrastável: arrastar para baixo fecha.
 */
export function BottomSheet({ visible, onClose, title, children, scroll = true }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const animateOut = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => cb?.());
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      animateIn();
    }
  }, [visible]);

  const handleClose = () => animateOut(onClose);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleZone}>
            <View style={styles.handle} />
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}

          {scroll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.backdrop },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: SCREEN_H * 0.86,
    ...shadow.sheet,
  },
  handleZone: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  handle: { width: 44, height: 5, borderRadius: radius.pill, backgroundColor: palette.borderStrong },
  title: {
    ...typography.title,
    color: palette.text,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
});

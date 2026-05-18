import React, { useState } from 'react';
import { 
  Text, 
  Pressable, 
  StyleSheet, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, spacing } from '../../theme';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  style?: TextStyle;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({ 
  text, 
  maxLines = 3, 
  style 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const colors = useThemeColors();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <>
      <Text 
        style={[styles.text, { color: colors.textDim }, style]}
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length > maxLines && !expanded) {
            setNeedsTruncation(true);
          }
        }}
      >
        {text}
      </Text>
      
      {needsTruncation && (
        <Pressable onPress={toggleExpand} style={styles.toggle}>
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: typography.sizes.md,
    lineHeight: 22,
  },
  toggle: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
});

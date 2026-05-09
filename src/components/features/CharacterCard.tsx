import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Character } from '../../types';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface CharacterCardProps {
  character: Character;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: character.imageUrl || 'https://via.placeholder.com/80x120' }} 
        style={styles.image} 
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{character.name}</Text>
        <Text style={styles.role}>{character.role}</Text>
        
        {character.voiceActor && (
          <View style={styles.vaContainer}>
            <Image 
              source={{ uri: character.voiceActor.imageUrl || 'https://via.placeholder.com/24x24' }} 
              style={styles.vaImage} 
            />
            <Text style={styles.vaName} numberOfLines={1}>
              {character.voiceActor.name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceVariant,
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    marginBottom: 2,
  },
  role: {
    color: colors.textDim,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
  },
  vaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  vaImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: colors.surfaceVariant,
  },
  vaName: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
});

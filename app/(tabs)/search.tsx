import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  Pressable 
} from 'react-native';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { PosterCard, GlassHeader, SkeletonLoader } from '../../src/components/ui';
import { useRouter } from 'expo-router';
import { animeApi } from '../../src/services/animeApi';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Media } from '../../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const GENRES = ['Action', 'Adventure', 'Fantasy', 'Sci-Fi', 'Horror', 'Comedy', 'Drama'];

  React.useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const data = await animeApi.searchAnime(debouncedQuery);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleMediaPress = (id: string) => {
    router.push(`/details/${id}`);
  };

  return (
    <View style={styles.container}>
      <GlassHeader title="Search" />
      
      <View style={styles.content}>
        <View style={styles.searchBar}>
          <SearchIcon color={colors.textDim} size={20} />
          <TextInput
            style={styles.input}
            placeholder="Search anime, characters..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <X color={colors.textDim} size={20} />
            </Pressable>
          )}
        </View>

        {query.length > 0 ? (
          isLoading ? (
            <View style={styles.resultsGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonLoader 
                  key={i}
                  width="47%" 
                  height={220} 
                  style={{ marginBottom: spacing.md, borderRadius: 12 }} 
                />
              ))}
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <PosterCard media={item} onPress={handleMediaPress} />
                </View>
              )}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No results found for "{query}"</Text>
            </View>
          )
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Popular Genres</Text>
            <View style={styles.genresGrid}>
              {GENRES.map((genre) => (
                <Pressable key={genre} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent searches yet</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 100,
    paddingHorizontal: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  input: {
    flex: 1,
    color: colors.text,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: typography.sizes.md,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 150,
  },
});

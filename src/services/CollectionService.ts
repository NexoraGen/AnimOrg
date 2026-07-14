import { UserCollection, WatchlistItem } from '../types';

export const CollectionService = {
    /**
     * Sorts user collections list
     */
    sortCollections: (
        collections: UserCollection[],
        sortBy: 'newest' | 'oldest' | 'alphabetical'
    ): UserCollection[] => {
        const list = [...collections];
        switch (sortBy) {
            case 'newest':
                return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            case 'oldest':
                return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            case 'alphabetical':
                return list.sort((a, b) => a.name.localeCompare(b.name));
            default:
                return list;
        }
    },

    /**
     * Sorts anime inside a collection based on watchlist cache data
     */
    sortAnimeInCollection: (
        animeIds: string[],
        watchlist: WatchlistItem[],
        sortBy: 'alphabetical' | 'newest_added' | 'oldest_added' | 'manual'
    ): string[] => {
        if (sortBy === 'manual') {
            return [...animeIds];
        }

        // Map animeIds to their watchlist representations
        const mappedItems = animeIds
            .map(id => {
                const item = watchlist.find(w => w.mediaId === id);
                return {
                    id,
                    title: item?.title || '',
                    addedAt: item?.addedAt || new Date(0).toISOString()
                };
            });

        switch (sortBy) {
            case 'alphabetical':
                mappedItems.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'newest_added':
                mappedItems.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                break;
            case 'oldest_added':
                mappedItems.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
                break;
        }

        return mappedItems.map(item => item.id);
    },

    /**
     * Searches for matches inside a list of anime in a collection
     */
    searchAnimeInCollection: (
        animeIds: string[],
        watchlist: WatchlistItem[],
        query: string
    ): string[] => {
        if (!query.trim()) return animeIds;
        const cleanQuery = query.toLowerCase().trim();

        return animeIds.filter(id => {
            const item = watchlist.find(w => w.mediaId === id);
            if (!item) return false;
            return item.title?.toLowerCase().includes(cleanQuery) ||
                item.genres?.some(g => g.toLowerCase().includes(cleanQuery));
        });
    },

    /**
     * Generates a portable JSON layout representation of a collection for future social sharing
     */
    exportCollectionBlueprint: (
        collection: UserCollection,
        watchlist: WatchlistItem[]
    ): string => {
        const animeDetails = collection.animeIds.map(id => {
            const item = watchlist.find(w => w.mediaId === id);
            return {
                id,
                title: item?.title || 'Unknown Anime',
                posterPath: item?.posterPath || '',
            };
        });

        const blueprint = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            metadata: {
                name: collection.name,
                description: collection.description || '',
                emoji: collection.emoji || '📂',
                coverImage: collection.coverImage || '',
            },
            animeList: animeDetails
        };

        return JSON.stringify(blueprint, null, 2);
    }
};

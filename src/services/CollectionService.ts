import { collection, doc, writeBatch, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase/config';
import { UserCollection, CollectionItem } from '../types';

export const CollectionService = {

    /**
     * Creates a new top-level collection document.
     */
    createCollection: async (userId: string, data: Partial<UserCollection>): Promise<UserCollection> => {
        const colRef = doc(collection(db, 'collections'));
        const newCol: UserCollection = {
            id: colRef.id,
            userId, // Extending type dynamically here or assumed available
            name: data.name || 'New Collection',
            description: data.description || '',
            emoji: data.emoji || '📂',
            coverImage: data.coverImage || '',
            isPinned: false,
            itemCount: 0,
            createdAt: new Date().toISOString(),
            ...data
        } as any;

        await setDoc(colRef, {
            ...newCol,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return newCol;
    },

    /**
     * Adds an item to a collection and atomically increments the item count.
     * Generates a predictable ID to prevent duplications natively.
     */
    addItemToCollection: async (
        collectionId: string,
        userId: string,
        animeData: { id: string, title: string, posterPath: string, genres: string[] }
    ): Promise<boolean> => {
        const itemId = `${collectionId}_${animeData.id}`;
        const itemRef = doc(db, 'collection_items', itemId);
        const colRef = doc(db, 'collections', collectionId);

        // Prevent duplicate overriding using batch
        const existing = await getDoc(itemRef);
        if (existing.exists()) {
            return false; // Already in collection
        }

        const batch = writeBatch(db);

        const newItem: CollectionItem = {
            id: itemId,
            collectionId,
            userId,
            animeId: animeData.id,
            title: animeData.title,
            posterPath: animeData.posterPath,
            genres: animeData.genres,
            addedAt: new Date().toISOString(),
        };

        batch.set(itemRef, {
            ...newItem,
            addedAt: serverTimestamp(),
        });

        // Increment count
        batch.update(colRef, {
            itemCount: increment(1),
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        return true;
    },

    /**
     * Removes an item and atomically decrements count.
     */
    removeItem: async (collectionId: string, animeId: string): Promise<void> => {
        const itemId = `${collectionId}_${animeId}`;
        const itemRef = doc(db, 'collection_items', itemId);
        const colRef = doc(db, 'collections', collectionId);

        const batch = writeBatch(db);
        batch.delete(itemRef);
        batch.update(colRef, {
            itemCount: increment(-1),
            updatedAt: serverTimestamp()
        });

        await batch.commit();
    },

    /**
     * Fetches collections for a user.
     */
    getUserCollections: async (userId: string): Promise<UserCollection[]> => {
        const q = query(collection(db, 'collections'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString() } as any));
    },

    /**
     * Atomic deletion of a collection and ALL its nested items.
     */
    deleteCollection: async (collectionId: string): Promise<void> => {
        const q = query(collection(db, 'collection_items'), where('collectionId', '==', collectionId));
        const itemsSnap = await getDocs(q);

        const batch = writeBatch(db);
        // Delete metadata
        batch.delete(doc(db, 'collections', collectionId));
        // Delete all items
        itemsSnap.docs.forEach(d => {
            batch.delete(d.ref);
        });

        await batch.commit();
    },

    /**
     * Edits collection metadata
     */
    updateCollection: async (collectionId: string, updates: Partial<UserCollection>): Promise<void> => {
        const ref = doc(db, 'collections', collectionId);
        await updateDoc(ref, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Helper to sort collections locally
     */
    sortCollections: (collections: UserCollection[], sortBy: 'newest' | 'oldest' | 'alphabetical'): UserCollection[] => {
        return [...collections].sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sortBy === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            if (sortBy === 'alphabetical') {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });
    }
};

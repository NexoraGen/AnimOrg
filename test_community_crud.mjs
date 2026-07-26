import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    limit,
    deleteDoc,
    serverTimestamp,
    getDoc,
    increment,
    writeBatch,
    where
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCTgVGBV60FJpkk8CebCA5CppPFKvrV5YY",
    authDomain: "animorg-nexora.firebaseapp.com",
    projectId: "animorg-nexora",
    storageBucket: "animorg-nexora.firebasestorage.app",
    messagingSenderId: "177485044340",
    appId: "1:177485044340:web:5e0ec2630cb585b7860f21",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Simple mock of FirestoreService methods to verify logic
const firestoreServiceMock = {
    deletePostComment: async (postId, commentId) => {
        try {
            const commentRef = doc(db, 'posts', postId, 'comments', commentId);
            const postRef = doc(db, 'posts', postId);
            const batch = writeBatch(db);
            batch.delete(commentRef);
            batch.update(postRef, {
                comments: increment(-1),
                engagementScore: increment(-2)
            });
            await batch.commit();
            console.log(`[FirestoreServiceMock] Comment ${commentId} deleted successfully and comments count decremented on post.`);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    incrementPostShare: async (postId) => {
        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                shares: increment(1),
                engagementScore: increment(1)
            });
            console.log('[FirestoreServiceMock] Share incremented successfully.');
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    togglePostSave: async (userId, postId) => {
        const saveRef = doc(db, 'users', userId, 'savedPosts', postId);
        const snap = await getDoc(saveRef);
        if (snap.exists()) {
            await deleteDoc(saveRef);
            console.log(`[FirestoreServiceMock] Post ${postId} unsaved.`);
            return false;
        } else {
            await setDoc(saveRef, { postId, savedAt: serverTimestamp() });
            console.log(`[FirestoreServiceMock] Post ${postId} saved.`);
            return true;
        }
    },

    getSavedPosts: async (userId) => {
        try {
            const savedRef = collection(db, 'users', userId, 'savedPosts');
            const savedSnap = await getDocs(savedRef);
            const postIds = savedSnap.docs.map(d => d.id);
            if (postIds.length === 0) return [];

            const postsRef = collection(db, 'posts');
            const posts = [];

            const q = query(postsRef, where('__name__', 'in', postIds));
            const snap = await getDocs(q);
            snap.docs.forEach(docSnap => {
                posts.push({ id: docSnap.id, ...docSnap.data() });
            });

            return posts;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
};

async function getOrCreateUser(email, password, username) {
    let user;
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log(`[Auth] Registered new user: ${email} (${user.uid})`);
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            user = cred.user;
            console.log(`[Auth] Logged in existing user: ${email} (${user.uid})`);
        } else {
            console.error(`[Auth] Registration/Login failed for ${email}:`, e);
            throw e;
        }
    }

    // Secure Firestore Profile
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
        console.log(`[Firestore] Profile not found. Creating profile for ${username}...`);
        await setDoc(profileRef, {
            id: user.uid,
            email: email,
            username: username,
            followersCount: 0,
            followingCount: 0,
            favoriteGenres: [],
            watchStats: {
                animeCount: 0,
                totalHours: 0,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log(`[Firestore] Profile created for username ${username}`);
    }

    return user;
}

async function run() {
    console.log("=== STARTING COMMUNITY CRUD VERIFICATION ===");

    // 1. Setup/Login User 1
    const user1Email = "test_user1_community@example.com";
    const user1Password = "TestPassword123!";
    const user1Username = "tester_one";
    const user1 = await getOrCreateUser(user1Email, user1Password, user1Username);

    // 2. User 1: Write a community post
    console.log("\n--- Creating a community post... ---");
    const postsRef = collection(db, 'posts');
    const newPost = {
        userId: user1.uid,
        username: user1Username,
        userAvatar: '',
        type: 'discussion',
        category: 'discussion',
        content: `Automated test post at ${new Date().toISOString()}`,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementScore: 0,
        hasSpoilers: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(postsRef, newPost);
    const createdPostId = docRef.id;
    console.log(`[Firestore] Post created with ID: ${createdPostId}`);

    // 3. User 1: Write a comment
    console.log("\n--- Adding a comment to the post... ---");
    const commentRef = doc(db, 'posts', createdPostId, 'comments', 'comment_123');
    await setDoc(commentRef, {
        postId: createdPostId,
        userId: user1.uid,
        username: user1Username,
        text: "This is a verification comment!",
        createdAt: serverTimestamp(),
    });
    // Update comments count on post
    await updateDoc(doc(db, 'posts', createdPostId), {
        comments: increment(1)
    });
    console.log(`[Firestore] Comment added.`);

    // Verification Read post metadata
    let postSnap = await getDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Post comments count after comment addition: ${postSnap.data().comments}`);
    if (postSnap.data().comments !== 1) {
        throw new Error("Comments count mismatch after addition");
    }

    // 4. User 1: Delete comment and check count decrement
    console.log("\n--- Deleting the comment and checking updates... ---");
    await firestoreServiceMock.deletePostComment(createdPostId, 'comment_123');

    postSnap = await getDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Post comments count after comment deletion: ${postSnap.data().comments}`);
    if (postSnap.data().comments !== 0) {
        throw new Error("Comments count mismatch after deletion");
    }
    console.log(`🎉 SUCCESS: Comment count update verified.`);

    // 5. native sharing tests
    console.log("\n--- Testing Share increments... ---");
    await firestoreServiceMock.incrementPostShare(createdPostId);
    postSnap = await getDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Post shares count: ${postSnap.data().shares}`);
    if (postSnap.data().shares !== 1) {
        throw new Error("Shares count mismatch after sharing");
    }
    console.log(`🎉 SUCCESS: Shares increment verified.`);

    // 6. saved posts tests
    console.log("\n--- Testing Post Saving... ---");
    await firestoreServiceMock.togglePostSave(user1.uid, createdPostId);
    const savedFeed = await firestoreServiceMock.getSavedPosts(user1.uid);
    console.log(`[Firestore] Total saved posts count: ${savedFeed.length}`);
    if (savedFeed.length === 0 || !savedFeed.find(p => p.id === createdPostId)) {
        throw new Error("Saved post could not be retrieved from getSavedPosts list");
    }
    console.log(`🎉 SUCCESS: Post Save and Retrieval verified.`);

    // Cleanup Save
    console.log("\n--- Cleaning up setup... ---");
    await firestoreServiceMock.togglePostSave(user1.uid, createdPostId);
    await deleteDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Post deleted.`);

    await signOut(auth);
    console.log("[Auth] User 1 logged out.");
    console.log("\n=== VERIFICATION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});

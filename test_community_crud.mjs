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
    getDoc
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

        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        await setDoc(usernameRef, { uid: user.uid, createdAt: serverTimestamp() });
        console.log(`[Firestore] Profile created for username ${username}`);
    } else {
        console.log(`[Firestore] Profile already exists for UID: ${user.uid}`);
    }

    return user;
}

async function run() {
    console.log("=== STARTING COMMUNITY CRUD VERIFICATION ===");

    // 1. Setup/Login User 1
    console.log("\n--- USER 1: Authenticating... ---");
    const user1Email = "test_user1_community@example.com";
    const user1Password = "TestPassword123!";
    const user1Username = "tester_one";
    const user1 = await getOrCreateUser(user1Email, user1Password, user1Username);

    // 2. User 1: Write a community post
    console.log("\n--- USER 1: Creating a community post... ---");
    const testContent = `Automated verification post at ${new Date().toISOString()} #testing #animorg`;
    const postsRef = collection(db, 'posts');
    const newPost = {
        userId: user1.uid,
        username: user1Username,
        userAvatar: '',
        type: 'discussion',
        category: 'discussion',
        content: testContent,
        hashtags: ['testing', 'animorg'],
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
    console.log(`[Firestore] Post created successfully with ID: ${createdPostId}`);

    // Verification Read
    let draftSnap = await getDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Read original post content: "${draftSnap.data().content}"`);

    // 3. User 1: Update the post (Edit)
    console.log("\n--- USER 1: Updating the community post... ---");
    const updatedContent = `${testContent} [EDITED]`;
    const postRef = doc(db, 'posts', createdPostId);
    await updateDoc(postRef, {
        content: updatedContent,
        category: 'discussion',
        updatedAt: serverTimestamp()
    });
    console.log(`[Firestore] Post updated successfully.`);

    // Verification Read after update
    let updatedSnap = await getDoc(postRef);
    const updatedData = updatedSnap.data();
    if (updatedData.content === updatedContent) {
        console.log(`🎉 SUCCESS: Post update verified. Content: "${updatedData.content}"`);
    } else {
        console.error(`❌ FAILURE: Post content mismatch. Expected: "${updatedContent}" but got: "${updatedData.content}"`);
        process.exit(1);
    }

    // 4. User 1: Delete the post
    console.log("\n--- USER 1: Deleting the community post... ---");
    await deleteDoc(postRef);
    console.log(`[Firestore] Post deleted successfully.`);

    // Verification Read after delete
    let deletedSnap = await getDoc(postRef);
    if (!deletedSnap.exists()) {
        console.log(`🎉 SUCCESS: Post deletion verified. Document does not exist.`);
    } else {
        console.error(`❌ FAILURE: Post still exists in database after deletion.`);
        process.exit(1);
    }

    // 5. Sign out User 1
    await signOut(auth);
    console.log("[Auth] User 1 logged out.");

    console.log("\n=== VERIFICATION COMPLETED successfully! ===");
    process.exit(0);
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});

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
    console.log("=== STARTING COMMUNITY FEATURE VERIFICATION ===");

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
        category: 'Discussion',
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

    // 3. User 1: Log out
    await signOut(auth);
    console.log("[Auth] User 1 logged out.");

    // 4. Setup/Login User 2
    console.log("\n--- USER 2: Authenticating... ---");
    const user2Email = "test_user2_community@example.com";
    const user2Password = "TestPassword123!";
    const user2Username = "tester_two";
    const user2 = await getOrCreateUser(user2Email, user2Password, user2Username);

    // 5. User 2: Retrieve community feed and verify visibility of User 1's post
    console.log("\n--- USER 2: Fetching community feed to verify post visibility... ---");
    const feedQuery = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(15)
    );
    const querySnapshot = await getDocs(feedQuery);
    const feedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`[Firestore] Retrieved ${feedPosts.length} posts from community feed.`);
    const matchedPost = feedPosts.find(p => p.id === createdPostId);

    let testSuccess = false;
    if (matchedPost) {
        console.log(`\n======================================================`);
        console.log(`🎉 SUCCESS: USER 2 can see the post created by USER 1!`);
        console.log(`Post ID: ${matchedPost.id}`);
        console.log(`Posted By: @${matchedPost.username}`);
        console.log(`Content: "${matchedPost.content}"`);
        console.log(`======================================================\n`);
        testSuccess = true;
    } else {
        console.log(`\n======================================================`);
        console.log(`❌ FAILURE: USER 2 cannot see the post created by USER 1 in the feed.`);
        console.log(`Expected Post ID: ${createdPostId}`);
        console.log(`======================================================\n`);
    }

    // 6. Sign out User 2
    await signOut(auth);
    console.log("[Auth] User 2 logged out.");

    // 7. Cleanup: Sign back in as User 1 and delete the test post
    console.log("\n--- CLEANUP: Deleting test post... ---");
    await signInWithEmailAndPassword(auth, user1Email, user1Password);
    console.log("[Auth] Signed back in as User 1.");
    await deleteDoc(doc(db, 'posts', createdPostId));
    console.log(`[Firestore] Deleted test post doc: ${createdPostId}`);
    await signOut(auth);
    console.log("[Auth] User 1 logged out.");

    console.log("\n=== VERIFICATION COMPLETED ===");
    process.exit(testSuccess ? 0 : 1);
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});

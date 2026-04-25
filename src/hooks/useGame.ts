import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  increment,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../firebase';
import { User, Leaf, LeafStatus, OperationType, Position } from '../types';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function useGame() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        // Subscribe to user doc
        const unsub = onSnapshot(userDoc, (snap) => {
          if (snap.exists()) {
            setCurrentUser(snap.data() as User);
            if (!targetUser) setTargetUser(snap.data() as User); // Default view my tree
          } else {
            // Create initial user
            const newUser: User = {
              userId: u.uid,
              displayName: u.displayName,
              photoURL: u.photoURL,
              treeLevel: 1,
              fertilizer: 0,
              leafCount: 0,
              updatedAt: serverTimestamp()
            };
            setDoc(userDoc, newUser).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`));
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));
        return unsub;
      } else {
        setCurrentUser(null);
        setTargetUser(null);
        setLeaves([]);
        setLoading(false);
      }
    });
  }, []);

  // Sync Leaves
  useEffect(() => {
    if (!currentUser || !targetUser) return;

    const q = query(collection(db, `users/${targetUser.userId}/leaves`));
    const unsub = onSnapshot(q, (snap) => {
      const l: Leaf[] = [];
      snap.forEach(d => l.push(d.data() as Leaf));
      setLeaves(l);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUser.userId}/leaves`));

    return unsub;
  }, [currentUser, targetUser]);

  // Actions
  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') {
        console.log('User closed the login popup.');
      } else if (e.code === 'auth/popup-blocked') {
        alert('Login popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        handleFirestoreError(e, OperationType.WRITE, 'auth');
      }
    }
  };

  const addLeaf = async (imageUrl: string, pos: Position, branchIndex: number) => {
    if (!currentUser) return;
    
    const leafId = doc(collection(db, 'temp')).id;
    const newLeaf: Leaf = {
      leafId,
      userId: currentUser.userId,
      imageUrl,
      status: LeafStatus.ON_TREE,
      position: pos,
      branchIndex,
      createdAt: serverTimestamp()
    };

    // Add immediately to Firestore so it shows up in UI
    try {
      await setDoc(doc(db, `users/${currentUser.userId}/leaves`, leafId), newLeaf);
      await updateDoc(doc(db, 'users', currentUser.userId), {
        leafCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Background AI categorization (non-blocking)
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: `Analyze this image URL and categorize it into exactly one of these categories: NATURE, PEOPLE, FOOD, PLACES, OBJECTS. 
            Respond with a JSON object like {"category": "PEOPLE"}.
            Image URL: ${imageUrl}`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                enum: ["NATURE", "PEOPLE", "FOOD", "PLACES", "OBJECTS"]
              }
            },
            required: ["category"]
          }
        }
      })
      .then(response => {
        const data = JSON.parse(response.text || "{}");
        if (data.category) {
          const categoryMap: any = {
            'NATURE': 0,
            'PEOPLE': 20,
            'FOOD': 40,
            'PLACES': 60,
            'OBJECTS': 80
          };
          const base = categoryMap[data.category] || 80;
          const finalBranchIndex = base + Math.floor(Math.random() * 20);
          updateDoc(doc(db, `users/${currentUser.userId}/leaves`, leafId), {
            branchIndex: finalBranchIndex
          }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.userId}/leaves/${leafId}`));
        }
      })
      .catch(err => console.warn("AI Classification failed", err));

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.userId}/leaves/${leafId}`);
    }
  };

  const rakeLeaf = async (leafId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, `users/${currentUser.userId}/leaves`, leafId), {
        status: LeafStatus.RAKED
      });
      await updateDoc(doc(db, 'users', currentUser.userId), {
        fertilizer: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.userId}/leaves/${leafId}`);
    }
  };

  const nurtureTree = async () => {
    if (!currentUser || currentUser.fertilizer < 5) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.userId), {
        treeLevel: increment(1),
        fertilizer: increment(-5),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.userId}`);
    }
  };

  // Gravity effect for host
  useEffect(() => {
    if (!currentUser || targetUser?.userId !== currentUser.userId) return;

    const interval = setInterval(() => {
      const onTreeLeaves = leaves.filter(l => l.status === LeafStatus.ON_TREE);
      if (onTreeLeaves.length > 0 && Math.random() > 0.7) {
        const leafToFall = onTreeLeaves[Math.floor(Math.random() * onTreeLeaves.length)];
        updateDoc(doc(db, `users/${currentUser.userId}/leaves`, leafToFall.leafId), {
          status: LeafStatus.FALLEN,
          fallAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.userId}/leaves/${leafToFall.leafId}`));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser, targetUser, leaves]);

  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snap) => {
      const u: User[] = [];
      snap.forEach(d => u.push(d.data() as User));
      setAllUsers(u);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
  }, [currentUser]);

  return {
    currentUser,
    targetUser,
    setTargetUser,
    allUsers,
    leaves,
    loading,
    login,
    addLeaf,
    rakeLeaf,
    nurtureTree
  };
}

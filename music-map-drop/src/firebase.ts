import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, collection, query, where, getDocs, deleteDoc, doc, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "flashback-25e2f.firebaseapp.com",
  projectId: "flashback-25e2f",
  storageBucket: "flashback-25e2f.firebasestorage.app",
  messagingSenderId: "455429581660",
  appId: "1:455429581660:web:27714c2456182577222f99",
  measurementId: "G-5JD4XDL43L"
};

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app, "us-central1");

// Connect to emulator in development
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 5001);
  
  // Connect to Firestore emulator (if running)
  try {
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Connected to Firestore emulator");
  } catch (error) {
    // Emulator already connected, ignore
    console.log("Firestore emulator connection:", error);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Export callable functions
export const createDrop = httpsCallable(functions, "createDrop");

// Utility: Delete drops by track name (for cleanup)
export const deleteDropsByTrackName = async (trackName: string): Promise<number> => {
  try {
    const dropsRef = collection(db, 'drops');
    const q = query(dropsRef, where('trackName', '==', trackName));
    const querySnapshot = await getDocs(q);
    
    let deletedCount = 0;
    const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
      await deleteDoc(doc(db, 'drops', docSnapshot.id));
      deletedCount++;
      console.log(`Deleted drop: ${docSnapshot.id} - ${trackName}`);
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${deletedCount} drops with trackName: ${trackName}`);
    return deletedCount;
  } catch (error: any) {
    console.error('❌ Failed to delete drops:', error);
    throw error;
  }
};

// Utility: Delete drop by ID
export const deleteDropById = async (dropId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'drops', dropId));
    console.log(`✅ Deleted drop: ${dropId}`);
  } catch (error: any) {
    console.error(`❌ Failed to delete drop ${dropId}:`, error);
    throw error;
  }
};

// Utility: Check for duplicate drops (same trackName + similar location)
export const checkDuplicateDrop = async (
  trackName: string,
  latitude: number,
  longitude: number,
  tolerance: number = 0.001 // ~100m tolerance
): Promise<boolean> => {
  try {
    const dropsRef = collection(db, 'drops');
    const q = query(dropsRef, where('trackName', '==', trackName), limit(50));
    const querySnapshot = await getDocs(q);
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      const location = data.location;
      
      // Parse location (handle GeoPoint, object, or string)
      let lat: number, lng: number;
      if (location && typeof location === 'object') {
        lat = location.latitude ?? location._latitude ?? 0;
        lng = location.longitude ?? location._longitude ?? 0;
      } else if (typeof location === 'string') {
        // Parse string format: "[47.83° N, 122.27° W]"
        const match = location.match(/\[([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])\]/);
        if (match) {
          lat = parseFloat(match[1]);
          if (match[2] === 'S') lat = -lat;
          lng = parseFloat(match[3]);
          if (match[4] === 'W') lng = -lng;
        } else {
          continue; // Skip if can't parse
        }
      } else {
        continue; // Skip if no location
      }
      
      // Check if location is within tolerance
      const latDiff = Math.abs(lat - latitude);
      const lngDiff = Math.abs(lng - longitude);
      if (latDiff < tolerance && lngDiff < tolerance) {
        console.log(`⚠️ Duplicate drop found: ${trackName} at (${lat}, ${lng})`);
        return true;
      }
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Failed to check duplicate:', error);
    return false; // Allow creation if check fails
  }
};

// Utility: Clean up invalid or duplicate drops
export const cleanupDrops = async (): Promise<{ deleted: number; errors: number }> => {
  try {
    const dropsRef = collection(db, 'drops');
    const q = query(dropsRef, limit(500)); // Check up to 500 drops
    const querySnapshot = await getDocs(q);
    
    const seen = new Map<string, string>(); // trackName+location -> docId
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();
        const trackName = data.trackName || '';
        const location = data.location;
        
        // Parse location
        let lat: number, lng: number;
        if (location && typeof location === 'object') {
          lat = location.latitude ?? location._latitude ?? 0;
          lng = location.longitude ?? location._longitude ?? 0;
        } else if (typeof location === 'string') {
          const match = location.match(/\[([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])\]/);
          if (match) {
            lat = parseFloat(match[1]);
            if (match[2] === 'S') lat = -lat;
            lng = parseFloat(match[3]);
            if (match[4] === 'W') lng = -lng;
          } else {
            // Invalid location format - delete
            await deleteDoc(doc(db, 'drops', docSnapshot.id));
            deletedCount++;
            console.log(`🗑️ Deleted invalid location drop: ${docSnapshot.id}`);
            continue;
          }
        } else {
          // No location - delete
          await deleteDoc(doc(db, 'drops', docSnapshot.id));
          deletedCount++;
          console.log(`🗑️ Deleted drop without location: ${docSnapshot.id}`);
          continue;
        }
        
        // Check for duplicates (same trackName + location within 100m)
        const key = `${trackName}_${lat.toFixed(3)}_${lng.toFixed(3)}`;
        if (seen.has(key)) {
          // Duplicate found - delete the newer one (keep the first one)
          await deleteDoc(doc(db, 'drops', docSnapshot.id));
          deletedCount++;
          console.log(`🗑️ Deleted duplicate drop: ${docSnapshot.id} (duplicate of ${seen.get(key)})`);
        } else {
          seen.set(key, docSnapshot.id);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing drop ${docSnapshot.id}:`, error);
      }
    }
    
    console.log(`✅ Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`);
    return { deleted: deletedCount, errors: errorCount };
  } catch (error: any) {
    console.error('❌ Failed to cleanup drops:', error);
    throw error;
  }
};
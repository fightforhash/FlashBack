/**
 * Seed script: 30 emotional drops at Seoul & Seattle landmarks
 *
 * To see them in the local app, seed the emulator (app in DEV uses emulator):
 *   Terminal 1: npm run serve:full
 *   Terminal 2: cd functions && npm run seed:emulator
 *
 * To seed production Firestore: cd functions && npm run seed
 */
import * as admin from 'firebase-admin';

// When using emulator, set via env (seed:emulator script does this)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('Using Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'flashback-25e2f' });
}

const db = admin.firestore();

interface SeedDrop {
  trackName: string;
  artistName: string;
  coverUrl: string;
  previewUrl: string;
  userText: string;
  mood: string;
  latitude: number;
  longitude: number;
}

const seedDrops: SeedDrop[] = [
  // ===== SEOUL (15 drops) =====
  {
    trackName: 'Spring Day',
    artistName: 'BTS',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/7b/38/0b/7b380b2f-a2c0-8930-fbd3-03c695b76674/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Cherry blossoms falling on Yeouido... this song always takes me back to that spring walk.',
    mood: 'nostalgic',
    latitude: 37.5286,
    longitude: 126.9345,
  },
  {
    trackName: 'Eyes, Nose, Lips',
    artistName: 'TAEYANG',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/8a/92/51/8a9251c0-225c-b88e-8f8e-7e42a0c4ed85/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Broke up at this very bench in Namsan Tower. The city lights blurred through my tears.',
    mood: 'sad',
    latitude: 37.5512,
    longitude: 126.9882,
  },
  {
    trackName: 'Gangnam Style',
    artistName: 'PSY',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/bd/5f/00/bd5f0099-1b1f-7c21-24b6-6f6f2e364ace/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'The energy of Gangnam never dies. Dropped this here for the vibes!',
    mood: 'energetic',
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    trackName: 'Love Scenario',
    artistName: 'iKON',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/a5/32/7f/a5327f7b-2ad8-cd5b-c16f-2e04afd1e0a3/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'First date at Gyeongbokgung Palace. We walked the grounds humming this tune together.',
    mood: 'romantic',
    latitude: 37.5796,
    longitude: 126.9770,
  },
  {
    trackName: 'Blue',
    artistName: 'Big Bang',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ab/1b/cd/ab1bcd3e-bd93-12d4-8e89-68be3d7c7cc7/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Midnight stroll along the Han River. The reflections danced with every note.',
    mood: 'chill',
    latitude: 37.5133,
    longitude: 126.9417,
  },
  {
    trackName: 'Good Day',
    artistName: 'IU',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d7/6e/30/d76e3023-33c1-d7e3-adfb-2dd9dca6b93c/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Busking in Hongdae on a Friday night. A stranger played this and everyone sang along.',
    mood: 'happy',
    latitude: 37.5568,
    longitude: 126.9239,
  },
  {
    trackName: 'Palette',
    artistName: 'IU feat. G-Dragon',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music127/v4/90/70/a9/9070a926-c0ff-8637-b05d-76e97a7a0f80/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Sunset from Bukhansan summit. Twenty-five colors of the sky, just like this song.',
    mood: 'chill',
    latitude: 37.6594,
    longitude: 126.9782,
  },
  {
    trackName: 'Dynamite',
    artistName: 'BTS',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4f/46/5a/4f465a93-60a1-08f5-6bd6-fb8ee2e6a030/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Flash mob at Myeongdong! Random strangers joined in and we danced for 10 minutes straight.',
    mood: 'energetic',
    latitude: 37.5636,
    longitude: 126.9860,
  },
  {
    trackName: 'Starry Night',
    artistName: 'MAMAMOO',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/35/d5/de/35d5de78-7a00-ff51-fe2b-6d4e1e38e8b2/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Lotte World Tower observation deck at night. The city was a galaxy below us.',
    mood: 'romantic',
    latitude: 37.5126,
    longitude: 127.1025,
  },
  {
    trackName: 'HYPE BOY',
    artistName: 'NewJeans',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ae/8e/f9/ae8ef971-c397-27a3-ca01-cf0b4f0f6e7e/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Studying at a Sinchon cafe. This song kept me going through finals week.',
    mood: 'happy',
    latitude: 37.5559,
    longitude: 126.9368,
  },
  {
    trackName: 'Through the Night',
    artistName: 'IU',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music127/v4/90/70/a9/9070a926-c0ff-8637-b05d-76e97a7a0f80/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Late-night walk through Insadong. The empty streets felt like they belonged only to me.',
    mood: 'nostalgic',
    latitude: 37.5735,
    longitude: 126.9855,
  },
  {
    trackName: 'Antifragile',
    artistName: 'LE SSERAFIM',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4e/b4/60/4eb46037-0845-1c20-c49e-59ddb4a90b02/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Just got my dream job offer at COEX. Played this at max volume in celebration!',
    mood: 'energetic',
    latitude: 37.5116,
    longitude: 127.0592,
  },
  {
    trackName: 'Still Life',
    artistName: 'Big Bang',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ab/1b/cd/ab1bcd3e-bd93-12d4-8e89-68be3d7c7cc7/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Watching cherry blossoms at Seokchon Lake. Everything beautiful is fleeting.',
    mood: 'sad',
    latitude: 37.5089,
    longitude: 127.1005,
  },
  {
    trackName: 'Next Level',
    artistName: 'aespa',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/54/81/0d/54810d90-da48-bc2f-1f0c-14e0ff20471b/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'DDP at night. The architecture felt like stepping into the future.',
    mood: 'energetic',
    latitude: 37.5673,
    longitude: 127.0095,
  },
  {
    trackName: 'Celebrity',
    artistName: 'IU',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/2b/a6/15/2ba615b6-7d14-6fd3-c956-b2a2f2e8fdf5/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Street food at Gwangjang Market. Eating tteokbokki while this played from a nearby stall.',
    mood: 'happy',
    latitude: 37.5701,
    longitude: 126.9990,
  },

  // ===== SEATTLE (15 drops) =====
  {
    trackName: 'Smells Like Teen Spirit',
    artistName: 'Nirvana',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0b/c2/e2/0bc2e2e7-9c55-6c5c-fc8b-c2ab1d89c638/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Pike Place Market on a rainy morning. Seattle grunge lives forever.',
    mood: 'energetic',
    latitude: 47.6097,
    longitude: -122.3425,
  },
  {
    trackName: 'Black Hole Sun',
    artistName: 'Soundgarden',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/36/a6/0d/36a60d93-3c1c-7cf2-f29d-9ca0cd7b3a30/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Standing at Kerry Park, watching the sunset swallow the Space Needle.',
    mood: 'nostalgic',
    latitude: 47.6295,
    longitude: -122.3601,
  },
  {
    trackName: 'Can\'t Hold Us',
    artistName: 'Macklemore & Ryan Lewis',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f0/02/57/f00257e0-6b98-a1e2-22b4-5b80c55a64e3/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Graduation day at UW! We celebrated at Gas Works Park with the skyline behind us.',
    mood: 'happy',
    latitude: 47.6456,
    longitude: -122.3344,
  },
  {
    trackName: 'Skinny Love',
    artistName: 'Bon Iver',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/0e/77/56/0e7756b0-3e0e-8e68-5b9e-3cdd5f30d633/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Waiting for the ferry at Bainbridge. The fog made everything feel like a dream.',
    mood: 'sad',
    latitude: 47.6023,
    longitude: -122.3392,
  },
  {
    trackName: 'Electric Feel',
    artistName: 'MGMT',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/2c/26/78/2c267838-6093-2147-e94b-21b2b2a0e77a/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Summer vibes at Green Lake. Cycling around while the sun hit the water just right.',
    mood: 'chill',
    latitude: 47.6812,
    longitude: -122.3419,
  },
  {
    trackName: 'Lose Yourself',
    artistName: 'Eminem',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a4/6d/18/a46d18a7-b8a4-bb5c-f58f-c3df92c4bb7c/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Job interview prep at Seattle Central Library. This was my pump-up anthem.',
    mood: 'energetic',
    latitude: 47.6065,
    longitude: -122.3321,
  },
  {
    trackName: 'Chasing Cars',
    artistName: 'Snow Patrol',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/e1/40/5b/e1405b63-e4b4-8e4e-2cf1-4fcf42f2c6ca/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Lying on the grass at Volunteer Park. Watching clouds pass while this played on repeat.',
    mood: 'romantic',
    latitude: 47.6302,
    longitude: -122.3155,
  },
  {
    trackName: 'Sunflower',
    artistName: 'Post Malone, Swae Lee',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/bc/b0/3c/bcb03c02-4ff0-ce51-e5d9-3b16e1221ea1/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'First day at Amazon campus. Everything felt new and full of possibility.',
    mood: 'happy',
    latitude: 47.6223,
    longitude: -122.3364,
  },
  {
    trackName: 'The Night We Met',
    artistName: 'Lord Huron',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/5b/2e/b9/5b2eb94c-2e64-60e0-3e8c-e1b4e28f0dd7/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Last coffee at the original Starbucks before moving away from Seattle forever.',
    mood: 'nostalgic',
    latitude: 47.6102,
    longitude: -122.3425,
  },
  {
    trackName: 'Blinding Lights',
    artistName: 'The Weeknd',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/2a/27/e0/2a27e097-8a67-0024-8e85-0787f98a2e00/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Driving through the I-5 at night. Seattle skyline lit up like a movie scene.',
    mood: 'chill',
    latitude: 47.6165,
    longitude: -122.3284,
  },
  {
    trackName: 'Bohemian Rhapsody',
    artistName: 'Queen',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c9/02/56/c9025693-d3c0-1e7e-a8e5-8db70e2fcbfc/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Karaoke night at Capitol Hill. The whole bar sang this at the top of their lungs.',
    mood: 'energetic',
    latitude: 47.6254,
    longitude: -122.3222,
  },
  {
    trackName: 'Creep',
    artistName: 'Radiohead',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/1a/57/f31a57f9-622d-3dc6-8d8b-ad8f02f15e75/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Museum of Pop Culture. Standing in front of the Nirvana exhibit, feeling everything.',
    mood: 'sad',
    latitude: 47.6215,
    longitude: -122.3483,
  },
  {
    trackName: 'Here Comes the Sun',
    artistName: 'The Beatles',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/d0/79/90/d0799046-87f4-e7e3-76be-bfdad0e7a2e3/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'First sunny day after 3 months of rain. Discovery Park golden hour was magical.',
    mood: 'happy',
    latitude: 47.6574,
    longitude: -122.4055,
  },
  {
    trackName: 'Someone Like You',
    artistName: 'Adele',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d4/c1/78/d4c178c9-4538-f3ca-c0a4-e37b0ae5a43a/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Rainy afternoon at the Waterfront. Watching ferries come and go, thinking about what could have been.',
    mood: 'sad',
    latitude: 47.6060,
    longitude: -122.3408,
  },
  {
    trackName: 'Uptown Funk',
    artistName: 'Mark Ronson ft. Bruno Mars',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/27/5d/5d/275d5d92-f209-65b7-7a14-b38c9920b1c6/source/600x600bb.jpg',
    previewUrl: '',
    userText: 'Street festival at Fremont! The Troll under the bridge felt like it was dancing too.',
    mood: 'happy',
    latitude: 47.6510,
    longitude: -122.3472,
  },
];

async function seed() {
  console.log(`🌱 Seeding ${seedDrops.length} drops to Firestore...`);

  const batch = db.batch();

  for (const drop of seedDrops) {
    const ref = db.collection('drops').doc();
    batch.set(ref, {
      trackName: drop.trackName,
      artistName: drop.artistName,
      coverUrl: drop.coverUrl,
      previewUrl: drop.previewUrl,
      userText: drop.userText,
      mood: drop.mood,
      location: new admin.firestore.GeoPoint(drop.latitude, drop.longitude),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      likeCount: Math.floor(Math.random() * 50),
    });
    console.log(`  + ${drop.trackName} by ${drop.artistName} (${drop.mood})`);
  }

  await batch.commit();
  console.log(`✅ Successfully seeded ${seedDrops.length} drops!`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

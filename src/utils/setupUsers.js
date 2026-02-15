// Script pentru popularea colecției 'users' în Firebase
// Rulează acest script o singură dată pentru a crea utilizatorii în backend

import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

const USERS = [
  { username: "Sergiu", password: "Sergiu", role: "mentor", mentorId: "sergiu" },
  { username: "Dan", password: "Dan", role: "mentor", mentorId: "dan" },
  { username: "Tudor", password: "Tudor", role: "mentor", mentorId: "tudor" },
  { username: "Eli", password: "Eli", role: "mentor", mentorId: "eli" },
  { username: "Adrian", password: "Adrian", role: "mentor", mentorId: "adrian" },
  { username: "Admin", password: "Admin", role: "admin", mentorId: null }
];

export async function setupUsers() {
  try {
    console.log('🚀 Starting users setup...');
    
    const usersRef = collection(db, 'users');
    let created = 0;
    let skipped = 0;
    
    for (const user of USERS) {
      // Verifică dacă userul există deja
      const q = query(usersRef, where('username', '==', user.username));
      const existingUsers = await getDocs(q);
      
      if (existingUsers.empty) {
        await addDoc(usersRef, user);
        console.log(`✅ Created user: ${user.username} (${user.role})`);
        created++;
      } else {
        console.log(`⏭️  Skipped (already exists): ${user.username}`);
        skipped++;
      }
    }
    
    console.log(`\n✨ Setup complete!`);
    console.log(`   Created: ${created} users`);
    console.log(`   Skipped: ${skipped} users`);
    console.log('\n⚠️  IMPORTANT: După ce testezi că totul funcționează, schimbă parolele din Firebase Console!');
    
    return { created, skipped };
  } catch (error) {
    console.error('❌ Error setting up users:', error);
    throw error;
  }
}

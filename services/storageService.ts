
import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    onSnapshot,
    writeBatch,
    getDoc
} from 'firebase/firestore';
import { User, BenefitRecord, Notification, YearConfig, Role, Mandalam, Emirate, UserStatus, PaymentStatus, RegistrationQuestion, FieldType, CardConfig } from '../types';
import { MANDALAMS, EMIRATES } from '../constants';

// Collection References
const USERS_COLLECTION = 'users';
const BENEFITS_COLLECTION = 'benefits';
const NOTIFICATIONS_COLLECTION = 'notifications';
const YEARS_COLLECTION = 'years';
const QUESTIONS_COLLECTION = 'questions';
const SETTINGS_COLLECTION = 'settings';

// Master Admin Fallback
const ADMIN_USER: User = {
  id: 'admin-master',
  fullName: 'Shabeeb',
  email: 'shabeeb@vadakara.com', 
  mobile: '0500000000',
  whatsapp: '0500000000',
  emiratesId: '784000000000000',
  mandalam: Mandalam.VATAKARA,
  emirate: Emirate.DUBAI,
  status: UserStatus.APPROVED,
  paymentStatus: PaymentStatus.PAID,
  role: Role.MASTER_ADMIN,
  registrationYear: 2025,
  photoUrl: '',
  membershipNo: 'ADMIN001',
  registrationDate: new Date().toLocaleDateString(),
  password: 'ShabeeB@2025'
};

// Helper function for batched deletions to prevent "Write stream exhausted" errors
const deleteCollectionInBatches = async (collectionName: string) => {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) return;

    const batchSize = 400; // Safe limit below 500
    const docs = snapshot.docs;
    
    // Process in chunks
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        
        chunk.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        // Small delay to allow stream to clear
        await new Promise(resolve => setTimeout(resolve, 50));
    }
};

export const StorageService = {
  
  // --- REAL-TIME SUBSCRIPTIONS ---
  subscribeToUsers: (callback: (users: User[]) => void) => {
      const q = query(collection(db, USERS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => doc.data() as User);
          // Ensure Admin always exists in the stream if not found (fallback)
          if (!users.find(u => u.id === ADMIN_USER.id)) {
              callback([ADMIN_USER, ...users]);
          } else {
              callback(users);
          }
      }, (error) => {
          console.error("Firestore subscription error (Users):", error);
          // Fallback to allow login even if DB is locked/unavailable
          callback([ADMIN_USER]);
      });
  },

  subscribeToBenefits: (callback: (benefits: BenefitRecord[]) => void) => {
      const q = query(collection(db, BENEFITS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const benefits = snapshot.docs.map(doc => doc.data() as BenefitRecord);
          callback(benefits);
      }, (error) => {
          console.error("Firestore subscription error (Benefits):", error);
          callback([]);
      });
  },

  subscribeToNotifications: (callback: (notifications: Notification[]) => void) => {
      const q = query(collection(db, NOTIFICATIONS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const notifs = snapshot.docs.map(doc => doc.data() as Notification);
          // Sort by date desc
          notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(notifs);
      }, (error) => {
          console.error("Firestore subscription error (Notifications):", error);
          callback([]);
      });
  },

  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users = snapshot.docs.map(doc => doc.data() as User);
        if (!users.find(u => u.id === ADMIN_USER.id)) {
            return [ADMIN_USER, ...users];
        }
        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [ADMIN_USER];
    }
  },

  findUserForLogin: async (identifier: string): Promise<User | undefined> => {
     const cleanId = identifier.trim().toLowerCase();
     const users = await StorageService.getUsers();
     
     // Case insensitive check for admin username 'Shabeeb'
     if (cleanId === 'shabeeb') {
         const admin = users.find(u => u.role === Role.MASTER_ADMIN);
         return admin || ADMIN_USER;
     }

     return users.find(u => 
        (u.email && u.email.toLowerCase() === cleanId) || 
        (u.mobile && u.mobile.trim() === cleanId)
     );
  },

  addUser: async (user: User): Promise<User> => {
    try {
        const users = await StorageService.getUsers();

        if (user.email && users.find(u => u.email?.toLowerCase() === user.email?.toLowerCase())) {
        throw new Error(`User with email ${user.email} already exists.`);
        }
        if (users.find(u => u.emiratesId === user.emiratesId)) {
        throw new Error(`User with Emirates ID ${user.emiratesId} already exists.`);
        }

        await setDoc(doc(db, USERS_COLLECTION, user.id), user);
        return user;
    } catch (e) {
        console.error("Error adding user:", e);
        throw e;
    }
  },

  addUsers: async (newUsers: User[], onProgress?: (count: number) => void): Promise<User[]> => {
    // Firestore batched writes (max 500 per batch)
    // Reducing to 400 for safety against "Write stream exhausted"
    const batchSize = 400;
    let processed = 0;

    for (let i = 0; i < newUsers.length; i += batchSize) {
        const chunk = newUsers.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(user => {
            const ref = doc(db, USERS_COLLECTION, user.id);
            batch.set(ref, user);
        });
        await batch.commit();
        
        // Add a delay to prevent rate limiting and ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100)); 
        
        processed += chunk.length;
        if (onProgress) onProgress(processed);
    }
    return newUsers;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    // Use setDoc with merge:true to create if missing (safety for admin user) or update if exists
    await setDoc(userRef, updates, { merge: true });
  },

  // --- UTILS ---
  getNextSequence: async (year: number): Promise<number> => {
      const users = await StorageService.getUsers();
      const yearPrefix = year.toString();
      const relevantUsers = users.filter(u => u.membershipNo.startsWith(yearPrefix) && u.role !== Role.MASTER_ADMIN);
      
      if (relevantUsers.length === 0) return 1;

      let maxSeq = 0;
      relevantUsers.forEach(u => {
          const seqStr = u.membershipNo.substring(yearPrefix.length);
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
          }
      });
      return maxSeq + 1;
  },

  generateNextMembershipNo: async (year: number): Promise<string> => {
      const nextSeq = await StorageService.getNextSequence(year);
      return `${year}${nextSeq.toString().padStart(4, '0')}`;
  },

  // --- QUESTIONS ---
  getQuestions: async (): Promise<RegistrationQuestion[]> => {
      try {
          const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
          const qs = snapshot.docs.map(doc => doc.data() as RegistrationQuestion);
          return qs.sort((a, b) => a.order - b.order);
      } catch (e) {
          console.error("Error getting questions", e);
          return [];
      }
  },

  saveQuestion: async (question: RegistrationQuestion): Promise<void> => {
      await setDoc(doc(db, QUESTIONS_COLLECTION, question.id), question);
  },

  deleteQuestion: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
  },

  seedDefaultQuestions: async (): Promise<void> => {
      // First, delete ALL existing questions to prevent duplicates or stale data
      await deleteCollectionInBatches(QUESTIONS_COLLECTION);

      const defaultQuestions: RegistrationQuestion[] = [
          // 1. Name in Full
          { id: 'q_fullname', label: 'Name in Full (As per Passport)', type: FieldType.TEXT, required: true, order: 1, systemMapping: 'fullName' },
          
          // 2. Phone Number
          { id: 'q_mobile', label: 'Phone Number', type: FieldType.TEXT, required: true, order: 2, systemMapping: 'mobile' },
          
          // 3. WhatsApp Number
          { id: 'q_whatsapp', label: 'WhatsApp Number (With Country Code)', type: FieldType.TEXT, required: true, order: 3, systemMapping: 'whatsapp' },
          
          // 4. Email
          { id: 'q_email', label: 'Email', type: FieldType.TEXT, required: true, order: 4, systemMapping: 'email' },
          
          // SYSTEM: Password Field (Required for Auth)
          { id: 'q_password', label: 'Password', type: FieldType.PASSWORD, required: true, order: 5, systemMapping: 'password' },
          
          // 5. Age
          { id: 'q_age', label: 'Age', type: FieldType.NUMBER, required: true, order: 6 },
          
          // 6. Date of Birth
          { id: 'q_dob', label: 'Date of Birth', type: FieldType.DATE, required: true, order: 7, placeholder: 'Calendar' },
          
          // 7. Place of Birth
          { id: 'q_pob', label: 'Place of Birth', type: FieldType.TEXT, required: true, order: 8 },
          
          // 8. Marital Status
          { id: 'q_marital', label: 'Marital Status', type: FieldType.DROPDOWN, required: true, order: 9, options: ['Single', 'Married'] },
          
          // 9. Number of Children
          { id: 'q_children', label: 'Number of Children', type: FieldType.NUMBER, required: false, order: 10 },

          // 10. Address in UAE
          { id: 'q_address_uae', label: 'Address in UAE', type: FieldType.TEXTAREA, required: true, order: 11, systemMapping: 'addressUAE' },
          
          // 11. Family Residence in UAE
          { id: 'q_family_uae', label: 'Family Residence in UAE', type: FieldType.DROPDOWN, required: true, order: 12, options: ['Yes', 'No'] },
          
          // 12. If Yes: Wife’s Number
          { 
              id: 'q_wife_no', 
              label: 'If Yes: Wife’s Number for "VNRI Vanitha Vedi"', 
              type: FieldType.TEXT, 
              required: false, 
              order: 13,
              parentQuestionId: 'q_family_uae',
              dependentOptions: { 'Yes': [] } 
          },
          
          // 13. Permanent Address in India
          { id: 'q_address_india', label: 'Permanent Address in India', type: FieldType.TEXTAREA, required: true, order: 14, systemMapping: 'addressIndia' },

          // 14. Educational Qualification
          { id: 'q_qualification', label: 'Educational Qualification', type: FieldType.TEXT, required: false, order: 15 },
          
          // 15. Profession
          { id: 'q_profession', label: 'Profession', type: FieldType.TEXT, required: false, order: 16 },

          // 16. Nominee Name
          { id: 'q_nominee', label: 'Nominee Name', type: FieldType.TEXT, required: false, order: 17, systemMapping: 'nominee' },
          
          // 17. Nominee Relation
          { 
              id: 'q_relation', 
              label: 'Nominee Relation', 
              type: FieldType.DROPDOWN, 
              required: false, 
              order: 18, 
              options: ['Father', 'Son', 'Daughter', 'Mother', 'Wife', 'Husband'], 
              systemMapping: 'relation' 
          },

          // REMOVED PHOTO UPLOAD QUESTION AS PER REQUEST

          // 19. Assembly Constituency (Mandalam)
          { 
              id: 'q_mandalam', 
              label: 'Assembly Constituency', 
              type: FieldType.DROPDOWN, 
              required: true, 
              order: 20, 
              options: MANDALAMS, 
              systemMapping: 'mandalam' 
          },

          // 20. Recommended By
          { id: 'q_recommended', label: 'Recommended By', type: FieldType.TEXT, required: false, order: 21, systemMapping: 'recommendedBy' },
      ];

      const batch = writeBatch(db);
      defaultQuestions.forEach(q => {
          const ref = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(ref, q);
      });
      await batch.commit();
  },

  // --- BENEFITS ---
  getBenefits: async (): Promise<BenefitRecord[]> => {
      try {
        const snapshot = await getDocs(collection(db, BENEFITS_COLLECTION));
        return snapshot.docs.map(doc => doc.data() as BenefitRecord);
      } catch (error) {
          console.error("Error getting benefits:", error);
          return [];
      }
  },

  addBenefit: async (benefit: BenefitRecord): Promise<void> => {
      await setDoc(doc(db, BENEFITS_COLLECTION, benefit.id), benefit);
  },

  deleteBenefit: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, BENEFITS_COLLECTION, id));
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (): Promise<Notification[]> => {
      try {
        const q = query(collection(db, NOTIFICATIONS_COLLECTION));
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map(doc => doc.data() as Notification);
        return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (error) {
          console.error("Error getting notifications:", error);
          return [];
      }
  },

  addNotification: async (notification: Notification): Promise<void> => {
      await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.id), notification);
  },

  deleteNotification: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  },

  // --- YEARS ---
  getYears: async (): Promise<YearConfig[]> => {
      try {
        const snapshot = await getDocs(collection(db, YEARS_COLLECTION));
        if (snapshot.empty) {
            return [{ year: 2025, status: 'ACTIVE', count: 0 }];
        }
        const years = snapshot.docs.map(doc => doc.data() as YearConfig);
        return years.sort((a, b) => b.year - a.year);
      } catch (error) {
          console.error("Error getting years:", error);
          return [{ year: 2025, status: 'ACTIVE', count: 0 }];
      }
  },

  createNewYear: async (year: number): Promise<void> => {
      const years = await StorageService.getYears();
      if (years.find(y => y.year === year)) {
          throw new Error("Year already exists");
      }
      const archivePromises = years.map(y => 
          updateDoc(doc(db, YEARS_COLLECTION, y.year.toString()), { status: 'ARCHIVED' })
      );
      await Promise.all(archivePromises);
      const newYear: YearConfig = { year, status: 'ACTIVE', count: 0 };
      await setDoc(doc(db, YEARS_COLLECTION, year.toString()), newYear);
  },
  
  // --- CARD CONFIG ---
  saveCardConfig: async (config: CardConfig): Promise<void> => {
      await setDoc(doc(db, SETTINGS_COLLECTION, 'card_config'), config);
  },
  
  getCardConfig: async (): Promise<CardConfig | null> => {
      try {
          const docRef = doc(db, SETTINGS_COLLECTION, 'card_config');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              return docSnap.data() as CardConfig;
          }
          return null;
      } catch (e) {
          console.error("Error fetching card config", e);
          return null;
      }
  },

  // --- DANGER ZONE: RESET ---
  resetDatabase: async (): Promise<void> => {
      const collections = [USERS_COLLECTION, BENEFITS_COLLECTION, NOTIFICATIONS_COLLECTION, YEARS_COLLECTION, QUESTIONS_COLLECTION, SETTINGS_COLLECTION];
      
      // 1. Delete all documents in all collections using batched deletion
      for (const colName of collections) {
          await deleteCollectionInBatches(colName);
      }

      // 2. IMPORTANT: Re-create the Master Admin "Shabeeb" immediately
      await setDoc(doc(db, USERS_COLLECTION, ADMIN_USER.id), ADMIN_USER);
  }
};

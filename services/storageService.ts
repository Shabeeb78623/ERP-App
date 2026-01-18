
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
    getDoc,
    addDoc,
    runTransaction,
    serverTimestamp
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
const MAIL_COLLECTION = 'mail';
const COUNTERS_COLLECTION = 'counters'; // New for atomic sequences

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

// Helper function for batched deletions
const deleteCollectionInBatches = async (collectionName: string) => {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) return;

    const batchSize = 400; 
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await new Promise(resolve => setTimeout(resolve, 50));
    }
};

export const StorageService = {
  
  // --- REAL-TIME SUBSCRIPTIONS ---
  subscribeToUsers: (callback: (users: User[]) => void) => {
      const q = query(collection(db, USERS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => doc.data() as User);
          if (!users.find(u => u.id === ADMIN_USER.id)) {
              callback([ADMIN_USER, ...users]);
          } else {
              callback(users);
          }
      }, (error) => {
          console.error("Firestore subscription error (Users):", error);
          callback([ADMIN_USER]);
      });
  },

  subscribeToBenefits: (callback: (benefits: BenefitRecord[]) => void) => {
      const q = query(collection(db, BENEFITS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const benefits = snapshot.docs.map(doc => doc.data() as BenefitRecord);
          callback(benefits);
      });
  },

  subscribeToNotifications: (callback: (notifications: Notification[]) => void) => {
      const q = query(collection(db, NOTIFICATIONS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const notifs = snapshot.docs.map(doc => doc.data() as Notification);
          notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(notifs);
      });
  },

  subscribeToYears: (callback: (years: YearConfig[]) => void) => {
      const q = query(collection(db, YEARS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const years = snapshot.docs.map(doc => doc.data() as YearConfig);
          years.sort((a, b) => b.year - a.year);
          callback(years);
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

  getUserById: async (id: string): Promise<User | null> => {
      try {
          const docRef = doc(db, USERS_COLLECTION, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              return docSnap.data() as User;
          }
          return null;
      } catch (error) {
          console.error("Error fetching user:", error);
          return null;
      }
  },

  addUser: async (user: User): Promise<User> => {
    try {
        // Run a transaction to ensure unique, sequential Membership Number
        await runTransaction(db, async (transaction) => {
            // 1. Check for duplicates
            const usersRef = collection(db, USERS_COLLECTION);
            const snapshot = await getDocs(usersRef); 
            const users = snapshot.docs.map(d => d.data() as User);

            // Only check for duplicates if the field is present/truthy
            if (user.email && users.find(u => u.email?.toLowerCase() === user.email?.toLowerCase())) {
                throw new Error(`User with email ${user.email} already exists.`);
            }
            if (user.emiratesId && users.find(u => u.emiratesId === user.emiratesId)) {
                throw new Error(`User with Emirates ID ${user.emiratesId} already exists.`);
            }

            // 2. Get Next Sequence Atomically
            const year = user.registrationYear;
            const counterRef = doc(db, COUNTERS_COLLECTION, `year_${year}`);
            const counterDoc = await transaction.get(counterRef);

            let nextSeq = 1;
            if (counterDoc.exists()) {
                const data = counterDoc.data();
                nextSeq = (data.lastSequence || 0) + 1;
            }

            // 3. Generate Membership No
            const membershipNo = `${year}${nextSeq.toString().padStart(4, '0')}`;
            const userWithId = { ...user, membershipNo };

            // 4. Writes
            transaction.set(counterRef, { lastSequence: nextSeq }, { merge: true });
            transaction.set(doc(db, USERS_COLLECTION, user.id), userWithId);
        });

        return user;
    } catch (e) {
        console.error("Error adding user:", e);
        throw e;
    }
  },

  addUsers: async (newUsers: User[], onProgress?: (count: number) => void): Promise<User[]> => {
    // Bulk import doesn't use transaction per user for speed, but tries to determine start seq
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
        await new Promise(resolve => setTimeout(resolve, 100)); 
        processed += chunk.length;
        if (onProgress) onProgress(processed);
    }
    
    // Update counter roughly after import
    if(newUsers.length > 0) {
        const year = newUsers[0].registrationYear;
        const maxSeq = newUsers.reduce((max, u) => {
            const seq = parseInt(u.membershipNo.slice(4));
            return seq > max ? seq : max;
        }, 0);
        await setDoc(doc(db, COUNTERS_COLLECTION, `year_${year}`), { lastSequence: maxSeq }, { merge: true });
    }

    return newUsers;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, updates, { merge: true });
  },
  
  deleteUser: async (userId: string): Promise<void> => {
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
  },

  // --- EMAILS ---
  sendEmail: async (to: string[], subject: string, body: string): Promise<void> => {
      try {
          if (!to || to.length === 0) return;
          await addDoc(collection(db, MAIL_COLLECTION), {
              to: to, 
              message: {
                  subject: subject,
                  text: body,
                  html: body.replace(/\n/g, '<br>')
              }
          });
      } catch (e) {
          console.error("Error queuing email:", e);
      }
  },

  sendOTP: async (toEmail: string, otp: string): Promise<void> => {
      console.log(`[SIMULATED EMAIL SERVICE] Sending OTP ${otp} to ${toEmail}`);
      return Promise.resolve();
  },

  // --- PAYMENT RESET ---
  resetAllUserPayments: async (newYear: number): Promise<void> => {
    console.log("Starting bulk payment reset...");
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = snapshot.docs.map(doc => doc.data() as User);
    
    const eligibleUsers = users.filter(u => u.role !== Role.MASTER_ADMIN && u.id);
    if (eligibleUsers.length === 0) return;

    const batchSize = 300; 
    const resetDate = new Date().toISOString();

    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = eligibleUsers.slice(i, i + batchSize);
        
        chunk.forEach(user => {
            if (user.id) {
                const ref = doc(db, USERS_COLLECTION, user.id);
                const updates: any = { 
                    paymentStatus: PaymentStatus.UNPAID,
                    paymentRemarks: '',
                    lastPaymentReset: resetDate 
                };
                if (user.status === UserStatus.APPROVED) {
                    updates.status = UserStatus.RENEWAL_PENDING;
                }
                batch.set(ref, updates, { merge: true });
            }
        });
        await batch.commit();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
  },

  // --- UTILS ---
  getNextSequence: async (year: number): Promise<number> => {
      const counterDoc = await getDoc(doc(db, COUNTERS_COLLECTION, `year_${year}`));
      if(counterDoc.exists()) {
          return (counterDoc.data().lastSequence || 0) + 1;
      }
      return 1;
  },

  generateNextMembershipNo: async (year: number): Promise<string> => {
      const nextSeq = await StorageService.getNextSequence(year);
      return `${year}${nextSeq.toString().padStart(4, '0')}`;
  },

  // --- DATA FETCHERS ---
  getQuestions: async (): Promise<RegistrationQuestion[]> => {
      try {
          const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
          const qs = snapshot.docs.map(doc => doc.data() as RegistrationQuestion);
          return qs.sort((a, b) => a.order - b.order);
      } catch (e) { return []; }
  },
  saveQuestion: async (q: RegistrationQuestion) => { await setDoc(doc(db, QUESTIONS_COLLECTION, q.id), q); },
  deleteQuestion: async (id: string) => { await deleteDoc(doc(db, QUESTIONS_COLLECTION, id)); },
  
  seedDefaultQuestions: async () => {
      // 1. Delete existing
      await deleteCollectionInBatches(QUESTIONS_COLLECTION);
      
      // 2. Define Defaults
      const defaults: RegistrationQuestion[] = [
          {
              id: 'q_fullname', label: 'Full Name', type: FieldType.TEXT, required: true, order: 1, 
              systemMapping: 'fullName', placeholder: 'Enter your full name as per Passport'
          },
          {
              id: 'q_mobile', label: 'Mobile Number', type: FieldType.NUMBER, required: true, order: 2, 
              systemMapping: 'mobile', placeholder: '0501234567'
          },
          {
              id: 'q_whatsapp', label: 'WhatsApp Number', type: FieldType.NUMBER, required: true, order: 3, 
              systemMapping: 'whatsapp', placeholder: '0501234567'
          },
          {
              id: 'q_email', label: 'Email Address', type: FieldType.TEXT, required: true, order: 4, 
              systemMapping: 'email', placeholder: 'you@example.com'
          },
          {
              id: 'q_password', label: 'Create Password', type: FieldType.PASSWORD, required: true, order: 5, 
              systemMapping: 'password', placeholder: 'Secure password for login'
          },
          {
              id: 'q_eid', label: 'Emirates ID', type: FieldType.TEXT, required: true, order: 6, 
              systemMapping: 'emiratesId', placeholder: '784-xxxx-xxxxxxx-x'
          },
          {
              id: 'q_emirate', label: 'Emirate', type: FieldType.DROPDOWN, required: true, order: 7, 
              systemMapping: 'emirate', options: EMIRATES
          },
          {
              id: 'q_mandalam', label: 'Mandalam', type: FieldType.DROPDOWN, required: true, order: 8, 
              systemMapping: 'mandalam', options: MANDALAMS
          },
          {
              id: 'q_addr_uae', label: 'UAE Address', type: FieldType.TEXTAREA, required: true, order: 9, 
              systemMapping: 'addressUAE'
          },
          {
              id: 'q_addr_ind', label: 'India Address', type: FieldType.TEXTAREA, required: true, order: 10, 
              systemMapping: 'addressIndia'
          },
           {
              id: 'q_rec', label: 'Recommended By', type: FieldType.TEXT, required: false, order: 11, 
              systemMapping: 'recommendedBy', placeholder: 'Name of existing member'
          },
          {
              id: 'q_nominee', label: 'Nominee Name', type: FieldType.TEXT, required: true, order: 12, 
              systemMapping: 'nominee'
          },
          {
              id: 'q_relation', label: 'Relation to Nominee', type: FieldType.DROPDOWN, required: true, order: 13, 
              systemMapping: 'relation', options: ['Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister']
          },
          {
              id: 'q_kmcc', label: 'Are you a KMCC Member?', type: FieldType.DROPDOWN, required: false, order: 14,
              systemMapping: 'isKMCCMember', options: ['Yes', 'No']
          },
           {
              id: 'q_kmcc_no', label: 'KMCC Membership No', type: FieldType.TEXT, required: false, order: 15,
              systemMapping: 'kmccNo', parentQuestionId: 'q_kmcc', dependentOptions: { 'Yes': [] }
          },
          {
              id: 'q_photo', label: 'Passport Photo', type: FieldType.FILE, required: false, order: 16,
              systemMapping: 'NONE', placeholder: 'Upload clear photo'
          }
      ];

      // 3. Add to Firestore
      const batch = writeBatch(db);
      defaults.forEach(q => {
          const ref = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(ref, q);
      });
      await batch.commit();
  },

  getBenefits: async () => {
      const s = await getDocs(collection(db, BENEFITS_COLLECTION));
      return s.docs.map(d => d.data() as BenefitRecord);
  },
  addBenefit: async (b: BenefitRecord) => { await setDoc(doc(db, BENEFITS_COLLECTION, b.id), b); },
  deleteBenefit: async (id: string) => { await deleteDoc(doc(db, BENEFITS_COLLECTION, id)); },

  getNotifications: async () => { /* ... existing ... */ return []; },
  addNotification: async (n: Notification) => { await setDoc(doc(db, NOTIFICATIONS_COLLECTION, n.id), n); },
  deleteNotification: async (id: string) => { await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id)); },

  createNewYear: async (year: number) => {
      const batch = writeBatch(db);
      const s = await getDocs(collection(db, YEARS_COLLECTION));
      s.forEach(d => batch.update(d.ref, { status: 'ARCHIVED' }));
      batch.set(doc(db, YEARS_COLLECTION, year.toString()), { year, status: 'ACTIVE', count: 0 });
      // Reset counter for new year
      batch.set(doc(db, COUNTERS_COLLECTION, `year_${year}`), { lastSequence: 0 });
      await batch.commit();
  },
  
  deleteYear: async (year: number) => { await deleteDoc(doc(db, YEARS_COLLECTION, year.toString())); },

  saveCardConfig: async (c: CardConfig) => { await setDoc(doc(db, SETTINGS_COLLECTION, 'card_config'), c); },
  getCardConfig: async () => { 
      const d = await getDoc(doc(db, SETTINGS_COLLECTION, 'card_config')); 
      return d.exists() ? d.data() as CardConfig : null; 
  },

  resetDatabase: async () => {
      const collections = [USERS_COLLECTION, BENEFITS_COLLECTION, NOTIFICATIONS_COLLECTION, YEARS_COLLECTION, QUESTIONS_COLLECTION, SETTINGS_COLLECTION, MAIL_COLLECTION, COUNTERS_COLLECTION];
      for (const col of collections) await deleteCollectionInBatches(col);
      await setDoc(doc(db, USERS_COLLECTION, ADMIN_USER.id), ADMIN_USER);
  }
};


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
    writeBatch
} from 'firebase/firestore';
import { User, BenefitRecord, Notification, YearConfig, Role, Mandalam, Emirate, UserStatus, PaymentStatus, RegistrationQuestion, FieldType } from '../types';
import { MANDALAMS, EMIRATES } from '../constants';

// Collection References
const USERS_COLLECTION = 'users';
const BENEFITS_COLLECTION = 'benefits';
const NOTIFICATIONS_COLLECTION = 'notifications';
const YEARS_COLLECTION = 'years';
const QUESTIONS_COLLECTION = 'questions';

// Master Admin Fallback
const ADMIN_USER: User = {
  id: 'admin-master',
  fullName: 'System Administrator',
  email: 'admin',
  mobile: '0000000000',
  whatsapp: '0000000000',
  emiratesId: '784000000000000',
  mandalam: Mandalam.BALUSSERY,
  emirate: Emirate.DUBAI,
  status: UserStatus.APPROVED,
  paymentStatus: PaymentStatus.PAID,
  role: Role.MASTER_ADMIN,
  registrationYear: 2025,
  photoUrl: '',
  membershipNo: 'ADMIN001',
  registrationDate: new Date().toLocaleDateString(),
  password: 'admin123'
};

export const StorageService = {
  
  // --- REAL-TIME SUBSCRIPTIONS ---
  subscribeToUsers: (callback: (users: User[]) => void) => {
      const q = query(collection(db, USERS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => doc.data() as User);
          // Ensure Admin always exists in the stream
          if (!users.find(u => u.role === Role.MASTER_ADMIN)) {
              callback([ADMIN_USER, ...users]);
          } else {
              callback(users);
          }
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
          // Sort by date desc
          notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(notifs);
      });
  },

  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users = snapshot.docs.map(doc => doc.data() as User);
        if (!users.find(u => u.role === Role.MASTER_ADMIN)) {
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
     
     return users.find(u => 
        (u.email && u.email.toLowerCase() === cleanId) || 
        (u.mobile && u.mobile.trim() === cleanId)
     );
  },

  addUser: async (user: User): Promise<User> => {
    const users = await StorageService.getUsers();

    if (user.email && users.find(u => u.email?.toLowerCase() === user.email?.toLowerCase())) {
      throw new Error(`User with email ${user.email} already exists.`);
    }
    if (users.find(u => u.emiratesId === user.emiratesId)) {
      throw new Error(`User with Emirates ID ${user.emiratesId} already exists.`);
    }

    await setDoc(doc(db, USERS_COLLECTION, user.id), user);
    return user;
  },

  addUsers: async (newUsers: User[], onProgress?: (count: number) => void): Promise<User[]> => {
    // Firestore batched writes (max 500 per batch)
    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < newUsers.length; i += batchSize) {
        const chunk = newUsers.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(user => {
            const ref = doc(db, USERS_COLLECTION, user.id);
            batch.set(ref, user);
        });
        await batch.commit();
        
        // Add a small delay to prevent rate limiting and ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 50)); 
        
        processed += chunk.length;
        if (onProgress) onProgress(processed);
    }
    return newUsers;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, updates);
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
      const defaultQuestions: RegistrationQuestion[] = [
          { id: 'q_fullname', label: 'Full Name', type: FieldType.TEXT, required: true, order: 1, systemMapping: 'fullName' },
          { id: 'q_mobile', label: 'Mobile Number', type: FieldType.TEXT, required: true, order: 2, systemMapping: 'mobile' },
          { id: 'q_whatsapp', label: 'WhatsApp Number', type: FieldType.TEXT, required: true, order: 3, systemMapping: 'whatsapp' },
          { id: 'q_email', label: 'Email Address', type: FieldType.TEXT, required: true, order: 4, systemMapping: 'email' },
          { id: 'q_pass', label: 'Password', type: FieldType.PASSWORD, required: true, order: 5, systemMapping: 'password' },
          { id: 'q_emirate', label: 'Emirate', type: FieldType.DROPDOWN, required: true, order: 6, options: EMIRATES, systemMapping: 'emirate' },
          { id: 'q_mandalam', label: 'Mandalam', type: FieldType.DROPDOWN, required: true, order: 7, options: MANDALAMS, systemMapping: 'mandalam' },
          { id: 'q_nominee', label: 'Nominee Name', type: FieldType.TEXT, required: true, order: 8, systemMapping: 'nominee' },
          { id: 'q_relation', label: 'Relation to Nominee', type: FieldType.TEXT, required: true, order: 9, systemMapping: 'relation' },
          { id: 'q_address_uae', label: 'Address (UAE)', type: FieldType.TEXTAREA, required: true, order: 10, systemMapping: 'addressUAE' },
          { id: 'q_address_india', label: 'Address (India)', type: FieldType.TEXTAREA, required: true, order: 11, systemMapping: 'addressIndia' },
          
          // Conditional Logic: KMCC
          { id: 'q_kmcc_member', label: 'KMCC Member?', type: FieldType.DROPDOWN, required: true, order: 12, options: ['Yes', 'No'], systemMapping: 'isKMCCMember' },
          { 
              id: 'q_kmcc_no', 
              label: 'KMCC Membership Number', 
              type: FieldType.TEXT, 
              required: false, 
              order: 13, 
              parentQuestionId: 'q_kmcc_member', 
              dependentOptions: {'Yes': []},
              systemMapping: 'kmccNo'
          },
          
          // Conditional Logic: Pratheeksha
          { id: 'q_pratheeksha_member', label: 'Pratheeksha Member?', type: FieldType.DROPDOWN, required: true, order: 14, options: ['Yes', 'No'], systemMapping: 'isPratheekshaMember' },
          { 
              id: 'q_pratheeksha_no', 
              label: 'Pratheeksha Membership number', 
              type: FieldType.TEXT, 
              required: false, 
              order: 15, 
              parentQuestionId: 'q_pratheeksha_member', 
              dependentOptions: {'Yes': []},
              systemMapping: 'pratheekshaNo'
          },
          
          { id: 'q_recommended', label: 'Recommended By', type: FieldType.TEXT, required: false, order: 16, systemMapping: 'recommendedBy' },
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
      const snapshot = await getDocs(collection(db, BENEFITS_COLLECTION));
      return snapshot.docs.map(doc => doc.data() as BenefitRecord);
  },

  addBenefit: async (benefit: BenefitRecord): Promise<void> => {
      await setDoc(doc(db, BENEFITS_COLLECTION, benefit.id), benefit);
  },

  deleteBenefit: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, BENEFITS_COLLECTION, id));
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (): Promise<Notification[]> => {
      const q = query(collection(db, NOTIFICATIONS_COLLECTION));
      const snapshot = await getDocs(q);
      const notifs = snapshot.docs.map(doc => doc.data() as Notification);
      return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addNotification: async (notification: Notification): Promise<void> => {
      await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.id), notification);
  },

  deleteNotification: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  },

  // --- YEARS ---
  getYears: async (): Promise<YearConfig[]> => {
      const snapshot = await getDocs(collection(db, YEARS_COLLECTION));
      if (snapshot.empty) {
          return [{ year: 2025, status: 'ACTIVE', count: 0 }];
      }
      const years = snapshot.docs.map(doc => doc.data() as YearConfig);
      return years.sort((a, b) => b.year - a.year);
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

  // --- DANGER ZONE: RESET ---
  resetDatabase: async (): Promise<void> => {
      const collections = [USERS_COLLECTION, BENEFITS_COLLECTION, NOTIFICATIONS_COLLECTION, YEARS_COLLECTION, QUESTIONS_COLLECTION];
      
      for (const colName of collections) {
          const q = query(collection(db, colName));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
      }
  }
};

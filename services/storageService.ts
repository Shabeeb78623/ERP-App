
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
import { User, BenefitRecord, Notification, YearConfig, Role, Mandalam, Emirate, UserStatus, PaymentStatus } from '../types';

// Collection References
const USERS_COLLECTION = 'users';
const BENEFITS_COLLECTION = 'benefits';
const NOTIFICATIONS_COLLECTION = 'notifications';
const YEARS_COLLECTION = 'years';

// Master Admin Fallback
const ADMIN_USER: User = {
  id: 'admin-master',
  fullName: 'System Administrator',
  email: 'admin',
  mobile: '0000000000',
  whatsapp: '0000000000',
  emiratesId: '784000000000000',
  mandalam: Mandalam.BALUSHERI,
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

  addUsers: async (newUsers: User[]): Promise<User[]> => {
    // Firestore batched writes (max 500 per batch)
    const batchSize = 500;
    for (let i = 0; i < newUsers.length; i += batchSize) {
        const chunk = newUsers.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(user => {
            const ref = doc(db, USERS_COLLECTION, user.id);
            batch.set(ref, user);
        });
        await batch.commit();
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
      const collections = [USERS_COLLECTION, BENEFITS_COLLECTION, NOTIFICATIONS_COLLECTION, YEARS_COLLECTION];
      
      for (const colName of collections) {
          const q = query(collection(db, colName));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
      }
  }
};


import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    orderBy
} from 'firebase/firestore';
import { User, BenefitRecord, Notification, YearConfig, Role, Mandalam, Emirate, UserStatus, PaymentStatus } from '../types';

// Collection References
const USERS_COLLECTION = 'users';
const BENEFITS_COLLECTION = 'benefits';
const NOTIFICATIONS_COLLECTION = 'notifications';
const YEARS_COLLECTION = 'years';

// Master Admin Fallback (In case DB is empty)
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
  
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users = snapshot.docs.map(doc => doc.data() as User);
        
        // Check if admin exists, if not locally inject/create (safety net)
        if (!users.find(u => u.role === Role.MASTER_ADMIN)) {
            return [ADMIN_USER, ...users];
        }
        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [ADMIN_USER]; // Fallback to allow login if DB fails
    }
  },

  findUserForLogin: async (identifier: string): Promise<User | undefined> => {
     const cleanId = identifier.trim().toLowerCase();
     // This is a bit inefficient for large DBs, but flexible for "Mobile OR Email" logic.
     // Ideally, we would run two queries or store a normalized 'loginId'.
     // For this scale, fetching all (cached by SDK) is acceptable or client-side filtering after load.
     const users = await StorageService.getUsers();
     
     return users.find(u => 
        (u.email && u.email.toLowerCase() === cleanId) || 
        (u.mobile && u.mobile.trim() === cleanId)
     );
  },

  addUser: async (user: User): Promise<User> => {
    // We perform checks against current data state
    // Note: In a real backend, these unique constraints should be Firestore Rules or Cloud Functions
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

  // Bulk Insert
  addUsers: async (newUsers: User[]): Promise<User[]> => {
    const batchPromises = newUsers.map(user => 
        setDoc(doc(db, USERS_COLLECTION, user.id), user)
    );
    await Promise.all(batchPromises);
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
      // Ideally order by date desc
      const q = query(collection(db, NOTIFICATIONS_COLLECTION));
      const snapshot = await getDocs(q);
      const notifs = snapshot.docs.map(doc => doc.data() as Notification);
      // Client side sort for simplicity
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

      // 1. Archive all existing years
      const archivePromises = years.map(y => 
          updateDoc(doc(db, YEARS_COLLECTION, y.year.toString()), { status: 'ARCHIVED' })
      );
      await Promise.all(archivePromises);

      // 2. Create new year
      const newYear: YearConfig = { year, status: 'ACTIVE', count: 0 };
      // Using year as ID for easy lookup
      await setDoc(doc(db, YEARS_COLLECTION, year.toString()), newYear);
  }
};

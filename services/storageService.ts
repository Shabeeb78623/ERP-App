
import { User, BenefitRecord, Role, UserStatus, PaymentStatus, Mandalam, Emirate, Notification, YearConfig } from '../types';

const USERS_KEY = 'uae_connect_users';
const BENEFITS_KEY = 'uae_connect_benefits';
const NOTIFICATIONS_KEY = 'uae_connect_notifications';
const YEARS_KEY = 'uae_connect_years';

// Firebase Preparation Note:
// When moving to Firebase, replace these localStorage calls with Firestore calls.
// Example: StorageService.getUsers() -> await db.collection('users').get()

// Seed Admin User
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
  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      const initialUsers = [ADMIN_USER];
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(stored);
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // Helper for login to handle CSV whitespace issues
  findUserForLogin: (identifier: string): User | undefined => {
     const users = StorageService.getUsers();
     const cleanId = identifier.trim().toLowerCase();
     
     return users.find(u => 
        (u.email && u.email.toLowerCase() === cleanId) || 
        (u.mobile && u.mobile.trim() === cleanId)
     );
  },

  generateNextMembershipNo: (year: number): string => {
    const users = StorageService.getUsers();
    const yearPrefix = year.toString();
    
    // Filter users for the current year
    const relevantUsers = users.filter(u => u.membershipNo.startsWith(yearPrefix) && u.role !== Role.MASTER_ADMIN);
    
    if (relevantUsers.length === 0) {
        return `${yearPrefix}0001`;
    }

    let maxSeq = 0;
    relevantUsers.forEach(u => {
        const seqStr = u.membershipNo.substring(yearPrefix.length);
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });

    const nextSequence = maxSeq + 1;
    return `${yearPrefix}${nextSequence.toString().padStart(4, '0')}`;
  },
  
  // Optimized helper to get integer sequence start for bulk operations
  getNextSequence: (year: number): number => {
    const users = StorageService.getUsers();
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

  addUser: (user: User) => {
    const users = StorageService.getUsers();
    
    // Strict check only for Email if provided
    if (user.email && users.find(u => u.email?.toLowerCase() === user.email?.toLowerCase())) {
      throw new Error(`User with email ${user.email} already exists.`);
    }
    
    // Strict check for Emirates ID
    if (users.find(u => u.emiratesId === user.emiratesId)) {
      throw new Error(`User with Emirates ID ${user.emiratesId} already exists.`);
    }
    
    users.push(user);
    StorageService.saveUsers(users);
    return users;
  },

  // Bulk insert for CSV imports
  addUsers: (newUsers: User[]) => {
    const users = StorageService.getUsers();
    const added: User[] = [];
    
    // Create Sets for fast lookup to avoid O(N^2) complexity
    const existingEmails = new Set(users.map(u => u.email?.toLowerCase()).filter(Boolean));
    const existingEIDs = new Set(users.map(u => u.emiratesId));

    newUsers.forEach(user => {
        // Skip if email exists (if email is present)
        if (user.email && existingEmails.has(user.email.toLowerCase())) {
            console.warn(`Skipping duplicate email: ${user.email}`);
            return;
        }
        // Skip if Emirates ID exists
        if (existingEIDs.has(user.emiratesId)) {
             console.warn(`Skipping duplicate EID: ${user.emiratesId}`);
             return;
        }
        
        users.push(user);
        added.push(user);
        
        // Add to sets to prevent duplicates within the import batch itself
        if(user.email) existingEmails.add(user.email.toLowerCase());
        existingEIDs.add(user.emiratesId);
    });

    StorageService.saveUsers(users);
    return added;
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      StorageService.saveUsers(users);
    }
    return users;
  },

  getBenefits: (): BenefitRecord[] => {
    const stored = localStorage.getItem(BENEFITS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addBenefit: (benefit: BenefitRecord) => {
    const benefits = StorageService.getBenefits();
    benefits.push(benefit);
    localStorage.setItem(BENEFITS_KEY, JSON.stringify(benefits));
    return benefits;
  },

  deleteBenefit: (id: string) => {
    const benefits = StorageService.getBenefits();
    const filtered = benefits.filter(b => b.id !== id);
    localStorage.setItem(BENEFITS_KEY, JSON.stringify(filtered));
    return filtered;
  },

  getNotifications: (): Notification[] => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addNotification: (notification: Notification) => {
    const notifications = StorageService.getNotifications();
    notifications.unshift(notification);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    return notifications;
  },
  
  deleteNotification: (id: string) => {
     const notifications = StorageService.getNotifications();
     const filtered = notifications.filter(n => n.id !== id);
     localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
     return filtered;
  },

  // Year Management
  getYears: (): YearConfig[] => {
      const stored = localStorage.getItem(YEARS_KEY);
      if (!stored) {
          return [{ year: 2025, status: 'ACTIVE', count: 0 }];
      }
      return JSON.parse(stored);
  },

  createNewYear: (year: number) => {
      const years = StorageService.getYears();
      if (years.find(y => y.year === year)) {
          throw new Error("Year already exists");
      }
      
      // Archive previous active years
      const updatedYears: YearConfig[] = years.map(y => ({ ...y, status: 'ARCHIVED' }));
      updatedYears.unshift({ year, status: 'ACTIVE', count: 0 });
      
      localStorage.setItem(YEARS_KEY, JSON.stringify(updatedYears));
      return updatedYears;
  }
};

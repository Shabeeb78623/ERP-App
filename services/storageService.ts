
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
import { User, BenefitRecord, Notification, Message, YearConfig, Role, Mandalam, Emirate, UserStatus, PaymentStatus, RegistrationQuestion, FieldType, CardConfig, Sponsor, NewsEvent } from '../types';
import { MANDALAMS, EMIRATES } from '../constants';

// Collection References
const USERS_COLLECTION = 'users';
const BENEFITS_COLLECTION = 'benefits';
const NOTIFICATIONS_COLLECTION = 'notifications';
const MESSAGES_COLLECTION = 'support_chats'; 
const YEARS_COLLECTION = 'years';
const QUESTIONS_COLLECTION = 'questions';
const SETTINGS_COLLECTION = 'settings';
const MAIL_COLLECTION = 'mail';
const COUNTERS_COLLECTION = 'counters';
const SPONSORS_COLLECTION = 'sponsors';
const NEWS_COLLECTION = 'news_events';

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
  password: 'ShabeeB@2025',
  source: 'WEB'
};

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

// --- DATA NORMALIZATION HELPER ---
const normalizeUser = (doc: any): User => {
    const data = doc.data();
    
    const safeStr = (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && typeof val.toDate === 'function') {
             try { return val.toDate().toLocaleDateString(); } catch (e) { return ''; }
        }
        return String(val);
    };

    let realFullName = safeStr(data.fullName);
    if ((!realFullName || realFullName === 'New User') && data.q_fullname) {
        realFullName = safeStr(data.q_fullname);
    }

    let realMobile = safeStr(data.mobile);
    if ((!realMobile || realMobile === '0000000000') && data.q_mobile) {
        realMobile = safeStr(data.q_mobile);
    }

    let realEmail = safeStr(data.email);
    if (!realEmail && data.q_email) {
        realEmail = safeStr(data.q_email);
    }

    const eid = safeStr(data.emiratesId) || safeStr(data.q_eid);
    
    let pwd = safeStr(data.password);
    if (!pwd && data.q_password) pwd = safeStr(data.q_password);
    if (!pwd && eid) pwd = eid;

    let realRole = Role.USER;
    if (data.role === 'MASTER_ADMIN') realRole = Role.MASTER_ADMIN;
    else if (data.role === 'MANDALAM_ADMIN') realRole = Role.MANDALAM_ADMIN;
    else if (data.role === 'CUSTOM_ADMIN') realRole = Role.CUSTOM_ADMIN;
    
    const rawMandalam = data.mandalam || data.q_mandalam;
    const rawEmirate = data.emirate || data.q_emirate;

    const matchEnum = (enumObj: any, val: string, defaultVal: string) => {
        if (!val) return defaultVal;
        const normalized = val.toString().toLowerCase().trim().replace(/_/g, ' '); 
        const found = Object.values(enumObj).find((e: any) => 
            e.toString().toLowerCase().replace(/_/g, ' ') === normalized
        );
        return found || defaultVal;
    };

    return {
        id: doc.id,
        fullName: realFullName || 'Unknown Member',
        email: realEmail,
        mobile: realMobile,
        whatsapp: safeStr(data.whatsapp) || safeStr(data.q_whatsapp) || realMobile,
        emiratesId: eid,
        mandalam: matchEnum(Mandalam, rawMandalam, Mandalam.VATAKARA) as Mandalam,
        emirate: matchEnum(Emirate, rawEmirate, Emirate.DUBAI) as Emirate,
        status: (Object.values(UserStatus).includes(data.status) ? data.status : UserStatus.PENDING) as UserStatus,
        paymentStatus: (Object.values(PaymentStatus).includes(data.paymentStatus) ? data.paymentStatus : PaymentStatus.UNPAID) as PaymentStatus,
        role: realRole,
        registrationYear: Number(data.registrationYear) || new Date().getFullYear(),
        photoUrl: safeStr(data.photoUrl) || safeStr(data.photo) || safeStr(data.image) || safeStr(data.profilePic),
        membershipNo: safeStr(data.membershipNo),
        registrationDate: safeStr(data.registrationDate) || new Date().toLocaleDateString(),
        addressUAE: safeStr(data.addressUAE) || safeStr(data.q_addr_uae),
        addressIndia: safeStr(data.addressIndia) || safeStr(data.q_addr_ind),
        nominee: safeStr(data.nominee) || safeStr(data.q_nominee),
        relation: safeStr(data.relation) || safeStr(data.q_relation),
        recommendedBy: safeStr(data.recommendedBy) || safeStr(data.q_rec),
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        assignedMandalams: Array.isArray(data.assignedMandalams) ? data.assignedMandalams : [],
        password: pwd, 
        isImported: !!data.isImported,
        paymentRemarks: safeStr(data.paymentRemarks),
        paymentProofUrl: safeStr(data.paymentProofUrl) || safeStr(data.paymentProof),
        approvedBy: safeStr(data.approvedBy),
        approvedAt: safeStr(data.approvedAt),
        source: safeStr(data.source) || (data.q_fullname ? 'APP' : 'WEB'),
        customData: typeof data.customData === 'object' && data.customData !== null ? data.customData : {}
    };
};

const normalizeNews = (doc: any): NewsEvent => {
    const data = doc.data();
    const safeStr = (val: any) => val ? String(val) : '';
    
    return {
        id: doc.id,
        title: safeStr(data.title),
        description: safeStr(data.description),
        date: safeStr(data.date),
        type: (data.type === 'EVENT' || data.type === 'NEWS') ? data.type : 'NEWS',
        imageUrl: safeStr(data.imageUrl) || safeStr(data.image) || safeStr(data.img), 
        location: safeStr(data.location),
        link: safeStr(data.link)
    };
};

const normalizeMessageContent = (data: any): string => {
    let content = data.content || data.message || data.body || data.text || '';
    if (typeof content === 'object' && content !== null) {
        if (content.text) return String(content.text);
        if (content.blocks && Array.isArray(content.blocks)) {
            return content.blocks.map((b: any) => b.text).join('\n');
        }
        return JSON.stringify(content);
    }
    content = String(content);
    if (content === '{}' || content === '[]') return '';
    return content;
};

const normalizeMessageUser = (data: any): string => {
    if (data.userName) return String(data.userName);
    if (data.name) return String(data.name);
    if (data.senderName) return String(data.senderName);
    if (data.user && typeof data.user === 'object' && data.user.name) return String(data.user.name);
    return 'Member';
};

export const StorageService = {
  
  subscribeToUsers: (callback: (users: User[]) => void) => {
      const q = query(collection(db, USERS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const users = snapshot.docs.map(doc => normalizeUser(doc));
          if (!users.find(u => u.id === ADMIN_USER.id)) {
              callback([ADMIN_USER, ...users]);
          } else {
              callback(users);
          }
      }, (error) => {
          console.error("Firestore Error:", error);
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

  subscribeToMessages: (callback: (messages: Message[]) => void) => {
      const q = query(collection(db, MESSAGES_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
              const d = doc.data();
              return {
                  id: doc.id,
                  userId: d.userId || '',
                  userName: normalizeMessageUser(d),
                  userRegNo: d.userRegNo || d.regNo || '',
                  subject: d.subject || 'Support Chat',
                  content: normalizeMessageContent(d), 
                  date: d.date || new Date().toISOString(),
                  status: d.status || 'NEW',
                  adminReply: normalizeMessageContent({ content: d.adminReply }) 
              } as Message;
          });
          msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(msgs);
      });
  },

  subscribeToSponsors: (callback: (sponsors: Sponsor[]) => void) => {
      const q = query(collection(db, SPONSORS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => doc.data() as Sponsor);
          callback(items);
      });
  },

  subscribeToNews: (callback: (news: NewsEvent[]) => void) => {
      const q = query(collection(db, NEWS_COLLECTION));
      return onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => normalizeNews(doc));
          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(items);
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

  getUsers: async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users = snapshot.docs.map(doc => normalizeUser(doc));
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
          return docSnap.exists() ? normalizeUser(docSnap) : null;
      } catch (error) {
          return null;
      }
  },

  addUser: async (user: User): Promise<User> => {
    try {
        await runTransaction(db, async (transaction) => {
            const usersRef = collection(db, USERS_COLLECTION);
            const snapshot = await getDocs(usersRef); 
            const users = snapshot.docs.map(d => d.data() as User);

            if (user.email && users.find(u => u.email?.toLowerCase() === user.email?.toLowerCase())) {
                throw new Error(`Email ${user.email} already exists.`);
            }
            if (user.emiratesId && users.find(u => u.emiratesId === user.emiratesId)) {
                throw new Error(`Emirates ID ${user.emiratesId} already exists.`);
            }

            const year = user.registrationYear || new Date().getFullYear();
            const counterRef = doc(db, COUNTERS_COLLECTION, `year_${year}`);
            const counterDoc = await transaction.get(counterRef);

            let nextSeq = 1;
            if (counterDoc.exists()) {
                nextSeq = (counterDoc.data().lastSequence || 0) + 1;
            }

            const membershipNo = `${year}${nextSeq.toString().padStart(4, '0')}`;
            const userWithId = { ...user, membershipNo, registrationYear: year, source: 'WEB' };

            transaction.set(counterRef, { lastSequence: nextSeq }, { merge: true });
            transaction.set(doc(db, USERS_COLLECTION, user.id), userWithId);
        });
        return user;
    } catch (e) {
        throw e;
    }
  },

  addUsers: async (newUsers: User[], onProgress?: (count: number) => void): Promise<User[]> => {
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
    
    if(newUsers.length > 0) {
        const year = newUsers[0].registrationYear;
        const maxSeq = newUsers.reduce((max, u) => {
            const seq = parseInt(u.membershipNo.slice(4));
            return isNaN(seq) ? max : (seq > max ? seq : max);
        }, 0);
        await setDoc(doc(db, COUNTERS_COLLECTION, `year_${year}`), { lastSequence: maxSeq }, { merge: true });
    }

    return newUsers;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    if (updates.status === UserStatus.APPROVED) {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
                const rawData = userSnap.data();
                
                // 1. Generate Membership Number if missing
                if (!rawData.membershipNo) {
                    const year = rawData.registrationYear || new Date().getFullYear();
                    const counterRef = doc(db, COUNTERS_COLLECTION, `year_${year}`);
                    const counterDoc = await transaction.get(counterRef);
                    let nextSeq = 1;
                    if (counterDoc.exists()) {
                        nextSeq = (counterDoc.data().lastSequence || 0) + 1;
                    }
                    const membershipNo = `${year}${nextSeq.toString().padStart(4, '0')}`;
                    updates.membershipNo = membershipNo;
                    updates.registrationYear = year;
                    
                    // CRITICAL FIX: Use set with merge instead of update, 
                    // because if year_2026 doesn't exist, update() will throw an error.
                    transaction.set(counterRef, { lastSequence: nextSeq }, { merge: true });
                }

                // 2. Flatten q_* fields into main profile fields
                if ((!rawData.fullName || rawData.fullName === 'New User') && rawData.q_fullname) {
                    updates.fullName = rawData.q_fullname;
                }
                if (!rawData.mobile && rawData.q_mobile) updates.mobile = rawData.q_mobile;
                if (!rawData.email && rawData.q_email) updates.email = rawData.q_email;
                if (!rawData.emiratesId && rawData.q_eid) updates.emiratesId = rawData.q_eid;
                if (!rawData.password && rawData.q_password) updates.password = rawData.q_password;
                
                if(rawData.q_addr_uae) updates.addressUAE = rawData.q_addr_uae;
                if(rawData.q_addr_ind) updates.addressIndia = rawData.q_addr_ind;
                if(rawData.q_nominee) updates.nominee = rawData.q_nominee;
                if(rawData.q_relation) updates.relation = rawData.q_relation;
                if(rawData.q_rec) updates.recommendedBy = rawData.q_rec;
                
                if(rawData.role === 'member') updates.role = Role.USER;
            }
            transaction.set(userRef, updates, { merge: true });
        });
    } else {
        await setDoc(userRef, updates, { merge: true });
    }
  },
  
  deleteUser: async (userId: string): Promise<void> => {
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
  },

  getNextSequence: async (year: number): Promise<number> => {
      const counterDoc = await getDoc(doc(db, COUNTERS_COLLECTION, `year_${year}`));
      return counterDoc.exists() ? (counterDoc.data().lastSequence || 0) + 1 : 1;
  },

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
      await deleteCollectionInBatches(QUESTIONS_COLLECTION);
      const defaults: RegistrationQuestion[] = [
          { id: 'q_fullname', label: 'Full Name', type: FieldType.TEXT, required: true, order: 1, systemMapping: 'fullName', placeholder: 'Enter your full name as per Passport' },
          { id: 'q_mobile', label: 'Mobile Number', type: FieldType.NUMBER, required: true, order: 2, systemMapping: 'mobile', placeholder: '0501234567' },
          { id: 'q_whatsapp', label: 'WhatsApp Number', type: FieldType.NUMBER, required: true, order: 3, systemMapping: 'whatsapp', placeholder: '0501234567' },
          { id: 'q_email', label: 'Email Address', type: FieldType.TEXT, required: true, order: 4, systemMapping: 'email', placeholder: 'you@example.com' },
          { id: 'q_password', label: 'Create Password', type: FieldType.PASSWORD, required: true, order: 5, systemMapping: 'password', placeholder: 'Secure password for login' },
          { id: 'q_eid', label: 'Emirates ID', type: FieldType.TEXT, required: true, order: 6, systemMapping: 'emiratesId', placeholder: '784-xxxx-xxxxxxx-x' },
          { id: 'q_emirate', label: 'Emirate', type: FieldType.DROPDOWN, required: true, order: 7, systemMapping: 'emirate', options: EMIRATES },
          { id: 'q_mandalam', label: 'Mandalam', type: FieldType.DROPDOWN, required: true, order: 8, systemMapping: 'mandalam', options: MANDALAMS },
          { id: 'q_addr_uae', label: 'UAE Address', type: FieldType.TEXTAREA, required: true, order: 9, systemMapping: 'addressUAE' },
          { id: 'q_addr_ind', label: 'India Address', type: FieldType.TEXTAREA, required: true, order: 10, systemMapping: 'addressIndia' },
          { id: 'q_rec', label: 'Recommended By', type: FieldType.TEXT, required: false, order: 11, systemMapping: 'recommendedBy', placeholder: 'Name of existing member' },
          { id: 'q_nominee', label: 'Nominee Name', type: FieldType.TEXT, required: true, order: 12, systemMapping: 'nominee' },
          { id: 'q_relation', label: 'Relation to Nominee', type: FieldType.DROPDOWN, required: true, order: 13, systemMapping: 'relation', options: ['Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister'] },
          { id: 'q_kmcc', label: 'Are you a KMCC Member?', type: FieldType.DROPDOWN, required: false, order: 14, systemMapping: 'isKMCCMember', options: ['Yes', 'No'] },
          { id: 'q_kmcc_no', label: 'KMCC Membership No', type: FieldType.TEXT, required: false, order: 15, systemMapping: 'kmccNo', parentQuestionId: 'q_kmcc', dependentOptions: { 'Yes': [] } },
          { id: 'q_photo', label: 'Passport Photo', type: FieldType.FILE, required: false, order: 16, systemMapping: 'NONE', placeholder: 'Upload clear photo' }
      ];
      const batch = writeBatch(db);
      defaults.forEach(q => batch.set(doc(db, QUESTIONS_COLLECTION, q.id), q));
      await batch.commit();
  },

  getBenefits: async () => {
      const s = await getDocs(collection(db, BENEFITS_COLLECTION));
      return s.docs.map(d => d.data() as BenefitRecord);
  },
  addBenefit: async (b: BenefitRecord) => { await setDoc(doc(db, BENEFITS_COLLECTION, b.id), b); },
  deleteBenefit: async (id: string) => { await deleteDoc(doc(db, BENEFITS_COLLECTION, id)); },

  addNotification: async (n: Notification) => { await setDoc(doc(db, NOTIFICATIONS_COLLECTION, n.id), n); },
  deleteNotification: async (id: string) => { await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id)); },

  sendMessage: async (m: Message) => { 
      // Sanitize message to avoid undefined values
      const msgData = { ...m };
      if (msgData.adminReply === undefined) msgData.adminReply = '';
      await setDoc(doc(db, MESSAGES_COLLECTION, m.id), msgData); 
  },
  markMessageReplied: async (id: string, reply: string) => { 
      await updateDoc(doc(db, MESSAGES_COLLECTION, id), { status: 'REPLIED', adminReply: reply }); 
  },

  addSponsor: async (s: Sponsor) => { 
      const safeSponsor = { ...s };
      if (safeSponsor.website === undefined) safeSponsor.website = '';
      await setDoc(doc(db, SPONSORS_COLLECTION, s.id), safeSponsor); 
  },

  deleteSponsor: async (id: string) => { await deleteDoc(doc(db, SPONSORS_COLLECTION, id)); },

  addNewsEvent: async (n: NewsEvent) => { 
      const safeNews = { ...n };
      if (safeNews.imageUrl === undefined) safeNews.imageUrl = '';
      if (safeNews.location === undefined) safeNews.location = '';
      if (safeNews.link === undefined) safeNews.link = ''; // Sanitize link
      if (safeNews.date === undefined) safeNews.date = new Date().toLocaleDateString();
      await setDoc(doc(db, NEWS_COLLECTION, n.id), safeNews); 
  },
  deleteNewsEvent: async (id: string) => { await deleteDoc(doc(db, NEWS_COLLECTION, id)); },

  createNewYear: async (year: number) => {
      const batch = writeBatch(db);
      const s = await getDocs(collection(db, YEARS_COLLECTION));
      // Archive existing
      s.forEach(d => batch.update(d.ref, { status: 'ARCHIVED' }));
      // Set new year
      batch.set(doc(db, YEARS_COLLECTION, year.toString()), { year, status: 'ACTIVE', count: 0 });
      // Reset or init counter for that year
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
      const collections = [USERS_COLLECTION, BENEFITS_COLLECTION, NOTIFICATIONS_COLLECTION, MESSAGES_COLLECTION, YEARS_COLLECTION, QUESTIONS_COLLECTION, SETTINGS_COLLECTION, MAIL_COLLECTION, COUNTERS_COLLECTION, SPONSORS_COLLECTION, NEWS_COLLECTION];
      for (const col of collections) await deleteCollectionInBatches(col);
      await setDoc(doc(db, USERS_COLLECTION, ADMIN_USER.id), ADMIN_USER);
  },

  sendEmail: async (to: string[], subject: string, body: string): Promise<void> => {
      try {
          if (!to || to.length === 0) return;
          await addDoc(collection(db, MAIL_COLLECTION), {
              to: to, 
              message: { subject, text: body, html: body.replace(/\n/g, '<br>') }
          });
      } catch (e) { console.error("Error queuing email:", e); }
  },

  sendOTP: async (toEmail: string, otp: string): Promise<void> => {
      console.log(`[SIMULATED EMAIL SERVICE] Sending OTP ${otp} to ${toEmail}`);
      return Promise.resolve();
  },

  resetAllUserPayments: async (newYear: number): Promise<void> => {
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
                    paymentProofUrl: '', // Reset proof
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
  }
};

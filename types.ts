
export enum Role {
  MASTER_ADMIN = 'MASTER_ADMIN',
  MANDALAM_ADMIN = 'MANDALAM_ADMIN',
  CUSTOM_ADMIN = 'CUSTOM_ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RENEWAL_PENDING = 'RENEWAL_PENDING',
}

export enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  UNPAID = 'UNPAID',
}

export enum BenefitType {
  HOSPITAL = 'HOSPITAL',
  DEATH = 'DEATH',
  GULF_RETURNEE = 'GULF_RETURNEE',
  CANCER = 'CANCER',
}

export enum Mandalam {
  BALUSHERI = 'BALUSHERI',
  KUNNAMANGALAM = 'KUNNAMANGALAM',
  KODUVALLI = 'KODUVALLI',
  NADAPURAM = 'NADAPURAM',
  KOYLANDI = 'KOYLANDI',
  VADAKARA = 'VADAKARA',
  BEPUR = 'BEPUR',
  KUTTIYADI = 'KUTTIYADI',
}

export enum Emirate {
  ABU_DHABI = 'ABU_DHABI',
  DUBAI = 'DUBAI',
  SHARJAH = 'SHARJAH',
  AJMAN = 'AJMAN',
  UMM_AL_QUWAIN = 'UMM_AL_QUWAIN',
  RAS_AL_KHAIMAH = 'RAS_AL_KHAIMAH',
  FUJAIRAH = 'FUJAIRAH',
}

export interface User {
  id: string;
  fullName: string;
  email?: string; // Optional for imported users initially
  mobile: string;
  whatsapp: string;
  emiratesId: string;
  mandalam: Mandalam;
  emirate: Emirate;
  status: UserStatus;
  paymentStatus: PaymentStatus;
  role: Role;
  registrationYear: number;
  photoUrl: string;
  membershipNo: string;
  registrationDate: string;
  
  // Extended fields
  addressUAE?: string;
  addressIndia?: string;
  nominee?: string;
  relation?: string;
  isKMCCMember?: boolean;
  kmccNo?: string;
  isPratheekshaMember?: boolean;
  pratheekshaNo?: string;
  recommendedBy?: string;
  
  // For admin logic
  permissions?: string[];
  assignedMandalams?: Mandalam[];
  password?: string; 
  isImported?: boolean; // Flag to trigger profile completion
}

export interface BenefitRecord {
  id: string;
  userId: string;
  type: BenefitType;
  amount: number;
  date: string;
  remarks: string;
  userName?: string; 
  regNo?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'BROADCAST' | 'INDIVIDUAL';
  targetAudience?: string; 
  recipients?: string[]; 
}

export interface YearConfig {
    year: number;
    status: 'ACTIVE' | 'ARCHIVED';
    count: number;
}

export type ViewState = 'DASHBOARD' | 'USERS' | 'PAYMENTS' | 'BENEFITS' | 'COMMUNICATIONS' | 'CARD' | 'AUTH' | 'ACCOUNT' | 'NOTIFICATIONS';

export interface DashboardStats {
  total: number;
  new: number;
  reReg: number;
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  admins: number;
  collected: number;
}


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
  THALASSERY = 'Thalassery',
  KUTHUPARAMBA = 'Kuthuparamba',
  VATAKARA = 'Vatakara',
  KUTTIADY = 'Kuttiady',
  NADAPURAM = 'Nadapuram',
  KOYILANDY = 'Koyilandy',
  PERAMBRA = 'Perambra',
  MAHE = 'Mahe'
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

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DROPDOWN = 'DROPDOWN',
  DEPENDENT_DROPDOWN = 'DEPENDENT_DROPDOWN',
  TEXTAREA = 'TEXTAREA',
  PASSWORD = 'PASSWORD',
  DATE = 'DATE',
  FILE = 'FILE'
}

export interface RegistrationQuestion {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // For standard dropdowns
  parentQuestionId?: string; // For dependent dropdowns or conditional visibility
  // Map parent value -> child options. e.g. { "Abu Dhabi": ["Mandalam1", "Mandalam2"] }
  // OR for simple visibility: { "Yes": [] } (means show this question if parent is "Yes")
  dependentOptions?: Record<string, string[]>; 
  order: number;
  required: boolean;
  placeholder?: string;
  
  // New field to map this question to a core User property
  systemMapping?: 'fullName' | 'email' | 'password' | 'mobile' | 'whatsapp' | 'emiratesId' | 'mandalam' | 'emirate' | 'addressUAE' | 'addressIndia' | 'nominee' | 'relation' | 'isKMCCMember' | 'kmccNo' | 'isPratheekshaMember' | 'pratheekshaNo' | 'recommendedBy' | 'NONE';
}

export interface User {
  id: string;
  fullName: string;
  email?: string; // Optional for imported users initially
  mobile: string;
  whatsapp: string;
  emiratesId: string;
  mandalam: Mandalam; // Keep for legacy/core logic
  emirate: Emirate;   // Keep for legacy/core logic
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
  paymentRemarks?: string; // Stores user entered payment details
  paymentProofUrl?: string; // Stores Base64 of payment proof image
  approvedBy?: string; // Stores the name of the admin who approved
  approvedAt?: string; // Date of approval
  source?: string;

  // Dynamic Data
  customData?: Record<string, any>;
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
  imageUrl?: string;
  link?: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userRegNo: string;
  subject: string;
  content: string;
  date: string;
  status: 'NEW' | 'REPLIED' | 'READ';
  adminReply?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string; // Base64
  website?: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'NEWS' | 'EVENT';
  imageUrl?: string; // Base64
  location?: string; // For events
  link?: string; // Optional external link
}

export interface YearConfig {
    year: number;
    status: 'ACTIVE' | 'ARCHIVED';
    count: number;
}

export interface CardField {
    id: string;
    label: string;
    key: string; // The property key in User object or customData key
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontWeight: 'normal' | 'bold';
    type?: 'TEXT' | 'QR'; // New field type
    sampleValue: string; // For preview
}

export interface CardSideConfig {
    templateImage: string; // Base64
    fields: CardField[];
    width: number; // Original width of template
    height: number; // Original height of template
}

export interface CardConfig {
    front: CardSideConfig;
    back: CardSideConfig;
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

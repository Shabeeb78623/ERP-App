import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification, Message, CardConfig, CardField, Sponsor, NewsEvent } from '../types';
import { Search, Trash2, Eye, Plus, Calendar, Edit, X, Check, ArrowUp, ArrowDown, Wallet, LayoutTemplate, ImagePlus, RefreshCw, AlertCircle, FileUp, Move, Save, BarChart3, PieChart, ShieldAlert, Lock, Download, UserPlus, XCircle, CheckCircle2, QrCode, ShieldCheck, UserCheck, Building2, BellRing, Mail, Copy, Send, Settings, CheckCircle, Smartphone, RotateCcw, MessageSquare, Reply, Globe, MapPin, HeartHandshake, Link as LinkIcon, Image as ImageIcon, MessageCircle, Clock, ChevronRight, User as UserIcon } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS } from '../constants';
import emailjs from '@emailjs/browser';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

// --- EMAILJS CONFIGURATION ---
const EMAILJS_SERVICE_ID = '';   
const EMAILJS_TEMPLATE_ID = '';  
const EMAILJS_PUBLIC_KEY = '';   

const ADMIN_PERMISSIONS = [
    { id: 'VIEW_USERS', label: 'View Users' },
    { id: 'APPROVE_USERS', label: 'Approve/Reject Users' },
    { id: 'MANAGE_PAYMENTS', label: 'Manage Payments' },
    { id: 'MANAGE_BENEFITS', label: 'Manage Benefits' },
    { id: 'SEND_NOTIFICATIONS', label: 'Send Notifications' },
    { id: 'REPLY_MESSAGES', label: 'Reply to Messages' },
    { id: 'MANAGE_CONTENT', label: 'Manage News & Sponsors' }
];

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  benefits: BenefitRecord[];
  notifications: Notification[];
  messages?: Message[];
  years: YearConfig[]; 
  sponsors?: Sponsor[];
  newsEvents?: NewsEvent[];
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onSwitchToUserView: () => void;
  isLoading: boolean;
}

// Updated Tabs List
const ALL_TABS = [
  'User Approvals', 'Users Overview', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Messages', 'News & Events', 'Sponsors', 
  'Import Users', 'Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, messages = [], years, sponsors = [], newsEvents = [], stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, onSwitchToUserView, isLoading }) => {
  const [activeTab, setActiveTab] = useState('User Approvals');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  
  // Modal States
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showMandalamModal, setShowMandalamModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);
  
  // Chat State
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  
  // Email Modal State
  const [showEmailReminderModal, setShowEmailReminderModal] = useState(false);
  
  // Admin Assign State
  const [isAssigningAdmin, setIsAssigningAdmin] = useState(false);

  // Content Mgmt State
  const [sponsorForm, setSponsorForm] = useState<Partial<Sponsor>>({});
  const [newsForm, setNewsForm] = useState<Partial<NewsEvent>>({ type: 'NEWS', date: new Date().toISOString().split('T')[0] });
  const [isUploadingContent, setIsUploadingContent] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  // Data States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  
  // New Year processing state
  const [isProcessingYear, setIsProcessingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState<string>(String(new Date().getFullYear() + 1));

  // Forms
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [sendingNotif, setSendingNotif] = useState(false);

  const [questionForm, setQuestionForm] = useState<Partial<RegistrationQuestion>>({
      type: FieldType.TEXT,
      required: true,
      order: 0,
      dependentOptions: {},
      options: [],
      systemMapping: 'NONE'
  });
  
  const [benefitForm, setBenefitForm] = useState({
      userId: '',
      type: BenefitType.HOSPITAL,
      amount: '',
      remarks: ''
  });
  
  const [editUserForm, setEditUserForm] = useState<Partial<User>>({});
  const [newUserForm, setNewUserForm] = useState<Partial<User>>({
      role: Role.USER,
      status: UserStatus.APPROVED,
      paymentStatus: PaymentStatus.UNPAID,
      mandalam: Mandalam.VATAKARA,
      emirate: Emirate.DUBAI
  });

  // Admin Assignment
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState<User | null>(null);
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [customMandalams, setCustomMandalams] = useState<Mandalam[]>([]);
  const [assignMandalamSel, setAssignMandalamSel] = useState<Mandalam[]>([]);

  // Card Management
  const [cardConfig, setCardConfig] = useState<CardConfig | null>(null);
  const [activeCardSide, setActiveCardSide] = useState<'front' | 'back'>('front');
  const [selectedVariable, setSelectedVariable] = useState<string>(''); 
  const cardImageRef = useRef<HTMLImageElement>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  
  const cardConfigRef = useRef<CardConfig | null>(null);
  useEffect(() => { cardConfigRef.current = cardConfig; }, [cardConfig]);

  // Filter Tabs based on Role
  const visibleTabs = ALL_TABS.filter(tab => {
      // Sensitive tabs for Master Admin only
      if (['Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt', 'Import Users'].includes(tab)) {
          return currentUser.role === Role.MASTER_ADMIN;
      }
      // Content management available to Master Admin
      if (['News & Events', 'Sponsors'].includes(tab)) {
          return currentUser.role === Role.MASTER_ADMIN;
      }
      return true;
  });

  useEffect(() => {
    setSearchTerm('');
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, currentUser.role]);

  useEffect(() => {
      const loadData = async () => {
          setQuestions(await StorageService.getQuestions());
          setCardConfig(await StorageService.getCardConfig());
      }
      loadData();
  }, [activeTab, isQuestionModalOpen]);

  // --- HELPER: Resolve User Name ---
  const resolveUserName = (userId: string, fallbackName: string) => {
      const u = users.find(user => user.id === userId);
      if (u) return u.fullName;
      if (fallbackName && fallbackName !== 'Member' && fallbackName !== 'User') return fallbackName;
      return "Unknown Member";
  };

  // --- HELPER: Group Messages by User ---
  const getGroupedMessages = () => {
      const groups: Record<string, { user: User | undefined, messages: Message[], latestDate: Date, unreadCount: number }> = {};
      
      messages.forEach(msg => {
          const userId = msg.userId || 'unknown';
          if (!groups[userId]) {
              const u = users.find(user => user.id === userId);
              groups[userId] = { 
                  user: u, 
                  messages: [], 
                  latestDate: new Date(0),
                  unreadCount: 0
              };
          }
          groups[userId].messages.push(msg);
          const msgDate = new Date(msg.date);
          if (msgDate > groups[userId].latestDate) {
              groups[userId].latestDate = msgDate;
          }
          if (msg.status !== 'REPLIED') {
              groups[userId].unreadCount++;
          }
      });

      return Object.entries(groups)
          .sort(([, a], [, b]) => b.latestDate.getTime() - a.latestDate.getTime())
          .map(([userId, data]) => ({ userId, ...data }));
  };

  // ... (Keep existing user authorization and filter logic)
  const getAuthorizedUsers = () => {
    const realUsers = users.filter(u => u.id !== 'admin-master');
    const isAssignTab = activeTab === 'Admin Assign';
    const effectiveUsers = (isAssignTab || activeTab === 'Users Overview')
        ? realUsers 
        : realUsers.filter(u => u.role === Role.USER);

    if (currentUser.role === Role.MASTER_ADMIN) return effectiveUsers;
    if (currentUser.role === Role.MANDALAM_ADMIN) {
        const allowed = currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0 
            ? currentUser.assignedMandalams 
            : [currentUser.mandalam];
        return effectiveUsers.filter(u => allowed.includes(u.mandalam));
    }
    return [];
  };

  const authorizedUsers = getAuthorizedUsers();
  const filteredList = authorizedUsers.filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
          u.fullName.toLowerCase().includes(term) ||
          u.membershipNo.toLowerCase().includes(term) ||
          u.mobile.includes(term) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          u.emiratesId.includes(term)
      );
      const matchesSector = sectorFilter === 'ALL' || u.mandalam === sectorFilter;
      return matchesSearch && matchesSector;
  });
  
  const filteredBenefits = benefits.filter(b => authorizedUsers.some(u => u.id === b.userId) && (
      (b.userName && b.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.regNo && b.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  ));

  // Actions
  const handleApproveUser = async (id: string) => { 
      if(confirm("Are you sure you want to APPROVE this user?")) { 
          try {
              await StorageService.updateUser(id, { 
                  status: UserStatus.APPROVED, 
                  approvedBy: currentUser.fullName, 
                  approvedAt: new Date().toLocaleDateString() 
              }); 
          } catch (e: any) {
              console.error(e);
              alert("Error approving user: " + e.message);
          }
      } 
  };
  const handleRejectUser = async (id: string) => { if(confirm("Are you sure you want to REJECT this user?")) { await StorageService.updateUser(id, { status: UserStatus.REJECTED }); } };
  const handleApprovePayment = async (id: string) => { if(confirm("Confirm payment received and approve user?")) { await StorageService.updateUser(id, { paymentStatus: PaymentStatus.PAID, status: UserStatus.APPROVED, approvedBy: currentUser.fullName, approvedAt: new Date().toLocaleDateString() }); } };
  const handleRevokePayment = async (id: string) => { if(confirm("Action: REVOKE PAYMENT\n\nThis will mark the user as UNPAID. They will lose access to benefits/ID card until paid again.\n\nContinue?")) { await StorageService.updateUser(id, { paymentStatus: PaymentStatus.UNPAID }); } };
  const handleRejectPayment = async (id: string) => { if(confirm("Reject this payment submission? User will be notified.")) { await StorageService.updateUser(id, { paymentStatus: PaymentStatus.UNPAID }); } };
  const handleRemindUnpaid = async () => { /* ... */ };
  const getUnpaidEmails = () => authorizedUsers.filter(u => u.role === Role.USER && u.paymentStatus !== PaymentStatus.PAID && u.email && u.email.includes('@')).map(u => u.email as string);
  const handleOpenEmailModal = () => { if (getUnpaidEmails().length === 0) { alert("No unpaid members with valid email addresses found."); return; } setShowEmailReminderModal(true); };
  
  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      onAddBenefit({ id: `benefit-${Date.now()}`, userId: benefitForm.userId, userName: user?.fullName, regNo: user?.membershipNo, type: benefitForm.type, amount: Number(benefitForm.amount), remarks: benefitForm.remarks, date: new Date().toLocaleDateString() });
      setIsBenefitModalOpen(false); setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
  };

  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) return alert("Enter title and message");
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          let audienceLabel = 'All Members';
          if (notifTarget !== 'ALL') { recipients = users.filter(u => u.mandalam === notifTarget).map(u => u.id); audienceLabel = `${notifTarget} Members`; } 
          else if (currentUser.role === Role.MANDALAM_ADMIN) { recipients = authorizedUsers.map(u => u.id); audienceLabel = 'My Members'; }
          const newNotification: Notification = { id: `notif-${Date.now()}`, title: notifTitle, message: notifMessage, date: new Date().toLocaleDateString(), read: false, type: recipients ? 'INDIVIDUAL' : 'BROADCAST', targetAudience: audienceLabel, recipients };
          await StorageService.addNotification(newNotification); alert("Notification Sent!"); setNotifTitle(''); setNotifMessage('');
      } catch (e: any) { alert("Error sending notification: " + e.message); } finally { setSendingNotif(false); }
  };
  const handleReplyMessage = async () => {
      if (!replyMessage || !replyContent) return;
      try {
          await StorageService.markMessageReplied(replyMessage.id, replyContent);
          await StorageService.addNotification({ id: `notif-reply-${Date.now()}`, title: `Reply: ${replyMessage.subject}`, message: replyContent, date: new Date().toLocaleDateString(), read: false, type: 'INDIVIDUAL', recipients: [replyMessage.userId], targetAudience: 'User' });
          setReplyMessage(null); setReplyContent(''); alert("Reply sent successfully.");
      } catch (e) { alert("Failed to send reply."); console.error(e); }
  };
  
  const handleAssignAdmin = async (user: User, role: Role) => {
      if (role === Role.MANDALAM_ADMIN) { setSelectedUserForAdmin(user); setAssignMandalamSel(user.assignedMandalams || [user.mandalam]); setShowMandalamModal(true); } 
      else if (role === Role.CUSTOM_ADMIN) { setSelectedUserForAdmin(user); setCustomPerms(user.permissions || []); setCustomMandalams(user.assignedMandalams || []); setShowCustomModal(true); } 
      else { 
          if(confirm(`${role === Role.USER ? "Revoke Admin Rights" : "Grant Master Admin"} for ${user.fullName}?`)) { 
              setIsAssigningAdmin(true);
              try { await StorageService.updateUser(user.id, { role: role, assignedMandalams: [], permissions: [] }); alert("User role updated successfully."); } catch (e) { alert("Failed."); } finally { setIsAssigningAdmin(false); }
          } 
      }
  };

  const handleDeleteUserAccount = async (userId: string, name: string) => { if (confirm(`Permanently delete ${name}?`)) { try { await StorageService.deleteUser(userId); alert("Deleted."); } catch (e) { alert("Failed."); } } };
  
  const saveAdminAssignment = async () => {
      if (!selectedUserForAdmin) return;
      setIsAssigningAdmin(true);
      try {
        if (showMandalamModal) { await StorageService.updateUser(selectedUserForAdmin.id, { role: Role.MANDALAM_ADMIN, assignedMandalams: assignMandalamSel }); } 
        else if (showCustomModal) { await StorageService.updateUser(selectedUserForAdmin.id, { role: Role.CUSTOM_ADMIN, permissions: customPerms, assignedMandalams: customMandalams }); }
        alert("Admin privileges granted."); setShowMandalamModal(false); setShowCustomModal(false); setSelectedUserForAdmin(null);
      } catch (e) { alert("Failed."); } finally { setIsAssigningAdmin(false); }
  };

  const handleImportUsers = async () => {
      if (!importFile) return;
      setIsImporting(true);
      setImportProgress(0);

      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) {
              setIsImporting(false);
              return;
          }

          const lines = text.split(/\r?\n/);
          const usersToImport: User[] = [];
          const currentYear = new Date().getFullYear();

          // Skip header if it exists (simple check if first row contains "Name" or similar)
          const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Basic CSV split - improvements possible for robust CSV
              const parts = line.split(',').map(p => p.trim());
              
              if (parts.length < 3) continue; // Minimum: Name, EID, Mobile

              const fullName = parts[0];
              const emiratesId = parts[1];
              const mobile = parts[2];
              const emirateStr = parts[3] || 'Dubai';
              const mandalamStr = parts[4] || 'Vatakara';
              const dateStr = parts[5];

              // Map to Enums
              const emirate = Object.values(Emirate).find(e => e.toLowerCase() === emirateStr.toLowerCase()) || Emirate.DUBAI;
              const mandalam = Object.values(Mandalam).find(m => m.toLowerCase() === mandalamStr.toLowerCase()) || Mandalam.VATAKARA;

              // Generate ID
              const id = `user-imp-${Date.now()}-${i}`;
              
              const newUser: User = {
                  id,
                  fullName,
                  emiratesId,
                  mobile,
                  whatsapp: mobile,
                  email: '', // Optional
                  role: Role.USER,
                  status: UserStatus.APPROVED, // Imported users are considered approved
                  paymentStatus: PaymentStatus.UNPAID, // Need to verify payment
                  mandalam: mandalam as Mandalam,
                  emirate: emirate as Emirate,
                  registrationYear: currentYear,
                  photoUrl: '',
                  membershipNo: '', // Will assign below
                  registrationDate: dateStr || new Date().toLocaleDateString(),
                  isImported: true,
                  password: emiratesId, // Set EID as default password
                  source: 'IMPORT'
              };
              usersToImport.push(newUser);
          }

          if (usersToImport.length === 0) {
              alert("No valid users found in CSV.");
              setIsImporting(false);
              return;
          }

          // Generate Membership Numbers
          try {
             // We need to fetch the last sequence first.
             const startSeq = await StorageService.getNextSequence(currentYear);
             
             usersToImport.forEach((u, index) => {
                 const seq = startSeq + index;
                 u.membershipNo = `${currentYear}${seq.toString().padStart(4, '0')}`;
             });

             // Now save users
             await StorageService.addUsers(usersToImport, (count) => {
                 setImportProgress(Math.round((count / usersToImport.length) * 100));
             });

             alert(`Successfully imported ${usersToImport.length} users.`);
             setImportFile(null);
          } catch (e: any) {
              console.error(e);
              alert("Import failed: " + e.message);
          } finally {
              setIsImporting(false);
              setImportProgress(0);
          }
      };
      
      reader.readAsText(importFile);
  };

  const handleAddNewUser = async () => { /* ... */ };
  
  const handleStartNewYear = async () => {
      const year = parseInt(newYearInput, 10);
      if(isNaN(year) || year < 2024 || year > 2050) return alert("Invalid year");
      if(!confirm(`Start Year ${year}?`)) return;
      setIsProcessingYear(true);
      try { await StorageService.createNewYear(year); await StorageService.resetAllUserPayments(year); alert(`Year ${year} started.`); setNewYearInput(String(year + 1)); } catch (e: any) { alert("Failed."); } finally { setIsProcessingYear(false); }
  };

  const handleDeleteYear = async (year: number) => { /* ... */ };
  const saveEditUser = async () => { if (!editUserForm.id) return; await onUpdateUser(editUserForm.id, { ...editUserForm }); setShowEditUserModal(false); setEditUserForm({}); };
  
  // --- UPLOAD HANDLERS ---
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      setIsUploadingTemplate(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          const currentConfig = cardConfig || { front: { templateImage: '', fields: [], width: 800, height: 500 }, back: { templateImage: '', fields: [], width: 800, height: 500 } };
          const img = new Image();
          img.src = base64;
          img.onload = async () => {
              const updatedSide = { ...currentConfig[activeCardSide], templateImage: base64, width: img.width, height: img.height };
              const newConfig = { ...currentConfig, [activeCardSide]: updatedSide };
              setCardConfig(newConfig);
              await StorageService.saveCardConfig(newConfig);
              setIsUploadingTemplate(false);
          };
      };
      reader.readAsDataURL(file);
  };

  const handleSponsorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !sponsorForm.name) { alert("Please enter sponsor name first."); return; }
      setIsUploadingContent(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          await StorageService.addSponsor({ id: `sponsor-${Date.now()}`, name: sponsorForm.name!, logoUrl: reader.result as string, website: sponsorForm.website || '' });
          setSponsorForm({}); setIsUploadingContent(false);
      };
      reader.readAsDataURL(file);
  };

  const handleNewsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => setNewsForm({ ...newsForm, imageUrl: reader.result as string });
      reader.readAsDataURL(file);
  };
  
  const handleAddNews = async () => {
      if(!newsForm.title || !newsForm.description) return alert("Title and Description required");
      setIsUploadingContent(true);
      await StorageService.addNewsEvent({ id: `news-${Date.now()}`, title: newsForm.title!, description: newsForm.description!, type: newsForm.type || 'NEWS', date: newsForm.date || new Date().toLocaleDateString(), imageUrl: newsForm.imageUrl, location: newsForm.location, link: newsForm.link });
      setNewsForm({ type: 'NEWS', date: new Date().toISOString().split('T')[0] }); setIsUploadingContent(false);
  };

  const addCardVariable = async () => {
      if (!selectedVariable) return;
      const currentConfig = cardConfig || { front: { templateImage: '', fields: [], width: 800, height: 500 }, back: { templateImage: '', fields: [], width: 800, height: 500 } };
      let label = "Unknown", key = selectedVariable, sample = "Sample Text", type: 'TEXT' | 'QR' = 'TEXT';
      if (key === 'membershipNo') { label = 'Registration No'; sample = '20250001'; } 
      else if (key === 'registrationDate') { label = 'Joined Date'; sample = '01/01/2025'; } 
      else if (key === 'qr_code_verify') { label = 'Verification QR Code'; sample = 'QR'; type = 'QR'; } 
      else { const q = questions.find(q => q.id === key); if (q) { label = q.label; key = (q.systemMapping && q.systemMapping !== 'NONE') ? q.systemMapping : q.id; sample = q.label; } }
      const newField: CardField = { id: `field-${Date.now()}`, label, key, x: 50, y: 50, fontSize: 14, color: '#000000', fontWeight: 'bold', sampleValue: sample, type };
      const currentSide = currentConfig[activeCardSide] || { templateImage: '', fields: [], width: 800, height: 500 };
      const updatedSide = { ...currentSide, fields: [...(currentSide.fields || []), newField] };
      const updatedConfig = { ...currentConfig, [activeCardSide]: updatedSide };
      setCardConfig(updatedConfig); 
      await StorageService.saveCardConfig(updatedConfig); 
      setSelectedVariable('');
  };

  const updateCardField = async (id: string, updates: Partial<CardField>) => { 
      if (!cardConfig) return;
      const currentSide = cardConfig[activeCardSide];
      const newFields = currentSide.fields.map(f => f.id === id ? { ...f, ...updates } : f);
      const newConfig = { ...cardConfig, [activeCardSide]: { ...currentSide, fields: newFields } };
      setCardConfig(newConfig);
      await StorageService.saveCardConfig(newConfig);
  };

  const deleteCardField = async (id: string) => {
      if (!cardConfig) return;
      const currentSide = cardConfig[activeCardSide];
      const newFields = currentSide.fields.filter(f => f.id !== id);
      const newConfig = { ...cardConfig, [activeCardSide]: { ...currentSide, fields: newFields } };
      setCardConfig(newConfig);
      await StorageService.saveCardConfig(newConfig);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => { 
      e.stopPropagation(); 
      e.preventDefault(); 
      setDraggedFieldId(id); 
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggedFieldId || !cardConfig || !cardImageRef.current) return;
      e.preventDefault();
      
      const rect = cardImageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      // Update local state without saving to DB yet for performance
      const currentSide = cardConfig[activeCardSide];
      const newFields = currentSide.fields.map(f => f.id === draggedFieldId ? { ...f, x, y } : f);
      setCardConfig({ ...cardConfig, [activeCardSide]: { ...currentSide, fields: newFields } });
  };

  const handleMouseUp = async () => {
      if (draggedFieldId && cardConfig) {
          setDraggedFieldId(null);
          await StorageService.saveCardConfig(cardConfig);
      }
  };

  const StatCard = ({ label, value, colorClass }: { label: string, value: string | number, colorClass: string }) => (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-500 uppercase font-medium mt-1">{label}</p>
      </div>
  );

  const pendingPayments = filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING);
  const paymentHistory = filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID || (u.paymentStatus === PaymentStatus.UNPAID && u.paymentRemarks));

  const handleDownloadCSV = () => { /* ... */ };

  const isSystemAdmin = currentUser.id === 'admin-master';
  const isMembershipPending = !isSystemAdmin && currentUser.paymentStatus !== PaymentStatus.PAID;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ... (Keep top section, stats, tabs) ... */}
      
      {isMembershipPending && (
          <div className="bg-gradient-to-r from-red-50 to-white border-l-4 border-red-500 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full text-red-600"><Wallet className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-red-800 text-sm">Action Required: Membership Fee Pending</h4><p className="text-xs text-red-600 mt-0.5">Your administrative account also requires membership renewal ({years[0]?.year || new Date().getFullYear()}).</p></div>
              </div>
              <button onClick={onSwitchToUserView} className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">Pay Membership Fee <ArrowUp className="w-3 h-3 rotate-45" /></button>
          </div>
      )}

      <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2></div>
          <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">Year:</span>
               <select className="bg-white border border-slate-200 text-sm font-bold rounded px-2 py-1 outline-none">{years.length > 0 ? (years.map(y => <option key={y.year} value={y.year}>{y.year}</option>)) : (<option>{new Date().getFullYear()}</option>)}</select>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total" value={stats.total} colorClass="text-blue-600" />
            <StatCard label="New" value={stats.new} colorClass="text-green-600" />
            <StatCard label="Re-reg" value={stats.reReg} colorClass="text-orange-600" />
            <StatCard label="Pending" value={stats.pending} colorClass="text-orange-500" />
            <StatCard label="Approved" value={stats.approved} colorClass="text-emerald-600" />
            <StatCard label="Rejected" value={stats.rejected} colorClass="text-red-600" />
            <StatCard label="Paid" value={stats.paid} colorClass="text-purple-600" />
            <StatCard label="Admins" value={stats.admins} colorClass="text-indigo-600" />
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 md:col-span-2"><p className="text-2xl font-bold text-emerald-600">AED {stats.collected}</p><p className="text-xs text-slate-500 uppercase font-medium mt-1">Collected</p></div>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 mt-2 no-scrollbar">
        {visibleTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'News & Events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600" /> Add News / Event</h3>
                  <div className="space-y-3">
                      <input className="w-full p-2 border rounded text-sm" placeholder="Title" value={newsForm.title || ''} onChange={e => setNewsForm({...newsForm, title: e.target.value})} />
                      <div className="flex gap-2">
                          <select className="p-2 border rounded text-sm bg-white" value={newsForm.type} onChange={e => setNewsForm({...newsForm, type: e.target.value as 'NEWS'|'EVENT'})}>
                              <option value="NEWS">News</option><option value="EVENT">Event</option>
                          </select>
                          {/* Added Date Picker */}
                          <input 
                              type="date" 
                              className="p-2 border rounded text-sm bg-white text-slate-600" 
                              value={newsForm.date || ''} 
                              onChange={e => setNewsForm({...newsForm, date: e.target.value})}
                          />
                          {newsForm.type === 'EVENT' && (<input className="flex-1 p-2 border rounded text-sm" placeholder="Location" value={newsForm.location || ''} onChange={e => setNewsForm({...newsForm, location: e.target.value})} />)}
                      </div>
                      <input className="w-full p-2 border rounded text-sm" placeholder="External Link (optional)" value={newsForm.link || ''} onChange={e => setNewsForm({...newsForm, link: e.target.value})} />
                      <textarea className="w-full p-2 border rounded text-sm h-20 resize-none" placeholder="Description..." value={newsForm.description || ''} onChange={e => setNewsForm({...newsForm, description: e.target.value})} />
                      <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer bg-slate-50 p-2 rounded border border-dashed border-slate-300">
                          <ImagePlus className="w-4 h-4" />{newsForm.imageUrl ? "Image Selected" : "Upload Image"}<input type="file" accept="image/*" className="hidden" onChange={handleNewsImageUpload} />
                      </label>
                      <button onClick={handleAddNews} disabled={isUploadingContent} className="w-full py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50">{isUploadingContent ? 'Publishing...' : 'Publish'}</button>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-h-[400px] overflow-y-auto">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Published Content</h4>
                  <div className="space-y-3">
                      {newsEvents.map(item => (
                          <div key={item.id} className="flex gap-3 p-3 border rounded hover:bg-slate-50">
                              {item.imageUrl && (<img src={item.imageUrl} className="w-12 h-12 object-cover rounded" />)}
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate">{item.title}</p>
                                  <div className="flex gap-2 items-center">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.type === 'EVENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.type}</span>
                                      <span className="text-[10px] text-slate-400">{item.date}</span>
                                  </div>
                                  {item.link && <a href={item.link} target="_blank" className="text-[10px] text-blue-500 underline truncate block mt-1">{item.link}</a>}
                              </div>
                              <button onClick={() => { if(confirm("Delete this item?")) StorageService.deleteNewsEvent(item.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      ))}
                      {newsEvents.length === 0 && <p className="text-xs text-slate-400">No content published.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* ... (Keep existing content for Sponsors, Payment Subs, Users Overview, etc.) ... */}
      {activeTab === 'Sponsors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ... Existing Sponsor Content ... */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-pink-600" /> Add Sponsor</h3>
                  <div className="space-y-3">
                      <input className="w-full p-2 border rounded text-sm" placeholder="Sponsor Name" value={sponsorForm.name || ''} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                      <input className="w-full p-2 border rounded text-sm" placeholder="Website URL (optional)" value={sponsorForm.website || ''} onChange={e => setSponsorForm({...sponsorForm, website: e.target.value})} />
                      <div className="flex gap-2 items-center">
                          <label className="flex-1 flex items-center justify-center gap-2 text-sm text-white cursor-pointer bg-slate-800 p-2 rounded font-bold hover:bg-slate-700 transition-colors">
                              <ImagePlus className="w-4 h-4" />{isUploadingContent ? "Uploading..." : "Upload Logo & Add"}<input type="file" accept="image/*" className="hidden" onChange={handleSponsorUpload} disabled={isUploadingContent} />
                          </label>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">Recommended: Transparent PNG, 200x200px</p>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-h-[400px] overflow-y-auto">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Active Sponsors</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {sponsors.map(s => (
                          <div key={s.id} className="relative group border rounded-lg p-2 flex flex-col items-center gap-2 hover:border-pink-200 transition-colors">
                              <img src={s.logoUrl} className="h-12 w-auto object-contain" />
                              <p className="text-xs font-bold text-center truncate w-full">{s.name}</p>
                              <button onClick={() => { if(confirm("Remove sponsor?")) StorageService.deleteSponsor(s.id); }} className="absolute top-1 right-1 p-1 bg-red-100 text-red-500 rounded hover:bg-red-200 shadow-sm transition-opacity z-10"><X className="w-3 h-3" /></button>
                          </div>
                      ))}
                      {sponsors.length === 0 && <p className="text-xs text-slate-400 col-span-3">No sponsors added.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* MESSAGES TAB - REDESIGNED CHAT INTERFACE */}
      {activeTab === 'Messages' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row h-[700px] overflow-hidden">
              {/* Left Sidebar: User List */}
              <div className={`${selectedChatUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-100 bg-slate-50`}>
                  <div className="p-4 border-b border-slate-100 bg-white">
                      <h3 className="font-bold text-slate-800 text-sm mb-3">Support Chats</h3>
                      <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-primary"
                            placeholder="Search member..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      {getGroupedMessages()
                        .filter(g => resolveUserName(g.userId, 'Unknown').toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(group => {
                          const name = resolveUserName(group.userId, 'Member');
                          const active = selectedChatUser === group.userId;
                          
                          return (
                              <div 
                                key={group.userId} 
                                onClick={() => setSelectedChatUser(group.userId)}
                                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-white flex gap-3 ${active ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                              >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                                      {name.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline mb-1">
                                          <p className={`text-sm font-bold truncate ${active ? 'text-primary' : 'text-slate-800'}`}>{name}</p>
                                          <span className="text-[10px] text-slate-400">{group.latestDate.toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 truncate">{group.messages[group.messages.length - 1].content}</p>
                                      {group.unreadCount > 0 && (
                                          <span className="mt-2 inline-block px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                              {group.unreadCount} New
                                          </span>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                      {getGroupedMessages().length === 0 && <div className="p-8 text-center text-xs text-slate-400">No conversations yet.</div>}
                  </div>
              </div>

              {/* Right: Chat Thread */}
              <div className={`${!selectedChatUser ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-white`}>
                  {selectedChatUser ? (
                      <>
                          {/* Chat Header */}
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
                              <div className="flex items-center gap-3">
                                  <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2 text-slate-500"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                                  <div>
                                      <h3 className="font-bold text-slate-900">{resolveUserName(selectedChatUser, 'Member')}</h3>
                                      <p className="text-xs text-slate-500 font-mono">ID: {users.find(u => u.id === selectedChatUser)?.membershipNo || 'N/A'}</p>
                                  </div>
                              </div>
                          </div>

                          {/* Messages Area */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                              {messages.filter(m => m.userId === selectedChatUser).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(msg => (
                                  <div key={msg.id} className="space-y-2">
                                      {/* User Message */}
                                      <div className="flex gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mt-1 shrink-0">
                                              {resolveUserName(msg.userId, 'U').charAt(0)}
                                          </div>
                                          <div className="bg-white border border-slate-200 p-4 rounded-r-xl rounded-bl-xl shadow-sm max-w-[80%]">
                                              <p className="text-xs font-bold text-slate-400 mb-1">{msg.subject}</p>
                                              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                              <p className="text-[10px] text-slate-400 mt-2 text-right">{new Date(msg.date).toLocaleString()}</p>
                                          </div>
                                      </div>

                                      {/* Admin Reply or Action */}
                                      {msg.adminReply ? (
                                          <div className="flex gap-3 justify-end">
                                              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-l-xl rounded-br-xl shadow-sm max-w-[80%]">
                                                  <p className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1 justify-end">
                                                      Replied <CheckCircle className="w-3 h-3"/>
                                                  </p>
                                                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.adminReply}</p>
                                              </div>
                                              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white mt-1 shrink-0">
                                                  A
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex justify-end pr-11">
                                              <button 
                                                  onClick={() => { setReplyMessage(msg); setReplyContent(`Hi ${resolveUserName(msg.userId, 'Member')},\n\n`); }}
                                                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm"
                                              >
                                                  <Reply className="w-3 h-3"/> Reply to this
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                          <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                          <p>Select a conversation to start chatting</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Payment Subs' && (
          <div className="space-y-6">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center"><h3 className="font-bold text-orange-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Pending Payment Approvals</h3><span className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-full">{pendingPayments.length} Requests</span></div><div className="divide-y divide-slate-100">{pendingPayments.length > 0 ? pendingPayments.map(u => (<div key={u.id} className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50"><div className="flex-1"><div className="flex items-center gap-3"><p className="font-bold text-slate-900">{u.fullName}</p><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{u.membershipNo}</span></div><div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3"><p className="text-xs text-blue-500 font-bold uppercase mb-1">Payment Remarks / Transaction ID</p><p className="text-sm text-slate-700 font-medium">"{u.paymentRemarks}"</p>{u.paymentProofUrl && <button onClick={() => setViewProofUrl(u.paymentProofUrl!)} className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 w-fit"><ImageIcon className="w-3 h-3"/> View Proof</button>}</div></div><div className="flex items-center gap-3 mt-4 md:mt-0 ml-4"><button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Eye className="w-5 h-5"/></button><button onClick={() => handleApprovePayment(u.id)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approve</button><button onClick={() => handleRejectPayment(u.id)} className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm font-bold rounded-lg hover:bg-red-50 flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</button></div></div>)) : (<div className="p-8 text-center text-slate-400 italic">No pending payment submissions.</div>)}</div></div>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 bg-slate-50 border-b border-slate-100"><h3 className="font-bold text-slate-700">Submission History</h3></div><div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">{paymentHistory.map(u => (<div key={u.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50"><div><p className="font-bold text-slate-900">{u.fullName}</p><p className="text-xs text-slate-500">{u.paymentRemarks}</p>{u.paymentProofUrl && <button onClick={() => setViewProofUrl(u.paymentProofUrl!)} className="text-[10px] text-blue-500 underline mt-1">View Proof</button>}</div><div className="text-right flex flex-col items-end gap-1">{u.paymentStatus === PaymentStatus.PAID ? (<div className="flex items-center gap-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">APPROVED</span><button onClick={() => handleRevokePayment(u.id)} className="text-orange-500 hover:text-orange-700" title="Revoke"><RotateCcw className="w-3 h-3" /></button></div>) : (<span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">REJECTED / UNPAID</span>)}<p className="text-[10px] text-slate-400 mt-1">{u.approvedBy ? `by ${u.approvedBy}` : ''}</p></div></div>))}{paymentHistory.length === 0 && <div className="p-6 text-center text-slate-400 text-xs">No history available.</div>}</div></div>
          </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Users Overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                <h3 className="font-bold text-slate-800">All Members Directory</h3>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700"><Download className="w-4 h-4" /> Export CSV</button>
                    <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary w-full" placeholder="Search members..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3">Reg No</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredList.map(u => (<tr key={u.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-mono text-slate-600">{u.membershipNo}</td><td className="px-6 py-4"><div className="font-bold text-slate-900">{u.fullName}</div><div className="text-xs text-slate-500">{u.mandalam}, {u.emirate}</div></td><td className="px-6 py-4"><div className="text-slate-700">{u.mobile}</div><div className="text-xs text-slate-400">{u.email}</div></td><td className="px-6 py-4"><div className="flex flex-col gap-1"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{u.status}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.paymentStatus === PaymentStatus.PAID ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{u.paymentStatus}</span></div></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="View Details"><Eye className="w-4 h-4"/></button><button onClick={() => { setEditUserForm(u); setShowEditUserModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit User"><Edit className="w-4 h-4"/></button>{u.paymentStatus === PaymentStatus.PAID && (<button onClick={() => handleRevokePayment(u.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Revoke Payment"><RotateCcw className="w-4 h-4"/></button>)}{currentUser.role === Role.MASTER_ADMIN && (<button onClick={() => handleDeleteUserAccount(u.id, u.fullName)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete User"><Trash2 className="w-4 h-4"/></button>)}</div></td></tr>))}</tbody></table></div>
        </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'User Approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Pending Approvals</h3><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div></div>
             <table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Details</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredList.filter(u => u.status === UserStatus.PENDING).map(u => (<tr key={u.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div><p className="font-bold">{u.fullName}</p><p className="text-xs text-slate-500">{u.mobile}</p></div></td><td className="px-6 py-4 text-xs"><p>{u.mandalam}, {u.emirate}</p><p className="text-slate-400">Reg: {u.registrationDate}</p></td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => setViewingUser(u)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4" /></button><button onClick={() => handleApproveUser(u.id)} className="px-3 py-1 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700">Approve</button><button onClick={() => handleRejectUser(u.id)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded font-bold text-xs hover:bg-red-50">Reject</button></td></tr>))}{filteredList.filter(u => u.status === UserStatus.PENDING).length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending approvals</td></tr>}</tbody></table>
        </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Payment Mgmt' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                   <h3 className="font-bold text-slate-700">Payment Management</h3>
                   <div className="flex gap-2"><button onClick={handleRemindUnpaid} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 border border-indigo-100 transition-colors"><BellRing className="w-3 h-3" /> Remind All Unpaid</button><button onClick={handleOpenEmailModal} className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-100 border border-sky-100 transition-colors"><Mail className="w-3 h-3" /> Email Unpaid</button><input className="px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search user..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
               </div>
               <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).map(u => (<tr key={u.id} className="border-b hover:bg-slate-50 last:border-0"><td className="px-6 py-4"><p className="font-bold text-slate-900">{u.fullName}</p><p className="text-xs text-slate-500">{u.membershipNo}</p></td><td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.paymentStatus==='PENDING'?'bg-orange-100 text-orange-700':'bg-red-50 text-red-500'}`}>{u.paymentStatus}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setViewingUser(u)} className="mr-2 p-1.5 bg-slate-100 rounded hover:bg-slate-200"><Eye className="w-4 h-4 text-slate-500"/></button><button onClick={() => handleApprovePayment(u.id)} className="px-3 py-1.5 bg-primary text-white text-xs rounded font-bold hover:bg-primary-dark">Mark Paid</button></td></tr>))}{filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).length === 0 && (<tr><td colSpan={3} className="p-8 text-center text-slate-400">All users in current view are paid.</td></tr>)}</tbody></table>
          </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Benefits' && (
          <div className="space-y-4">
              <div className="flex justify-between"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Search Benefit..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div><button onClick={() => setIsBenefitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4"/> Add Benefit</button></div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredBenefits.map(b => (<tr key={b.id} className="border-b hover:bg-slate-50"><td className="px-6 py-4"><div><p className="font-bold">{b.userName}</p><p className="text-xs text-slate-500">{b.regNo}</p></div></td><td className="px-6 py-4">{b.type}</td><td className="px-6 py-4 font-mono font-bold">AED {b.amount}</td><td className="px-6 py-4 text-xs">{b.date}</td><td className="px-6 py-4 text-right"><button onClick={()=>onDeleteBenefit(b.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>
      )}

    </div>
  );
};

export default AdminDashboard;
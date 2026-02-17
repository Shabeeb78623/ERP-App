
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

  const handleDragStart = (e: React.MouseEvent, id: string) => { e.stopPropagation(); e.preventDefault(); setDraggedFieldId(id); };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggedFieldId || !cardConfig || !cardImageRef.current) return;
      e.preventDefault();
      
      const rect = cardImageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Update local state
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredBenefits.map(b => (<tr key={b.id} className="border-b hover:bg-slate-50"><td className="px-6 py-4"><div><p className="font-bold">{b.userName}</p><p className="text-xs text-slate-500">{b.regNo}</p></div></td><td className="px-6 py-4">{b.type}</td><td className="px-6 py-4 font-mono font-bold">AED {b.amount}</td><td className="px-6 py-4 text-xs">{b.date}</td><td className="px-6 py-4 text-right"><button onClick={()=>onDeleteBenefit(b.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table></div>
          </div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Import Users' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-2xl mx-auto"><div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><FileUp className="w-8 h-8" /></div><h3 className="text-xl font-bold mb-2">Bulk Import Users</h3><p className="text-slate-500 mb-6 text-sm">Upload a CSV file with columns: Name, EmiratesID, Mobile, Emirate, Mandalam, JoinDate(optional).</p><div className="mb-6 flex justify-center"><input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} /></div><button onClick={handleImportUsers} disabled={!importFile || isImporting} className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark disabled:opacity-50">{isImporting ? `Importing... ${importProgress}%` : 'Start Import'}</button></div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Admin Assign' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6"><div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200"><div className="relative flex-1 mr-4"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Search members to assign role..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div></div><div className="bg-white p-4 rounded-xl border border-slate-200"><div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">{filteredList.slice(0, 100).map(u => (<div key={u.id} className="flex flex-col sm:flex-row justify-between items-center p-3 border rounded-xl hover:bg-slate-50 gap-2 transition-colors"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role !== Role.USER ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{u.fullName.charAt(0)}</div><div><p className="font-bold text-sm text-slate-900">{u.fullName}</p><div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.role === Role.MASTER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>{u.role.replace('_', ' ')}</span><span className="text-[10px] text-slate-400 font-mono">{u.membershipNo}</span></div></div></div><div className="flex gap-2 flex-wrap justify-end items-center">{u.role === Role.USER && (<><button onClick={()=>handleAssignAdmin(u, Role.MASTER_ADMIN)} className="text-[10px] bg-purple-600 text-white px-2 py-1.5 rounded font-bold hover:bg-purple-700">Master Admin</button><button onClick={()=>handleAssignAdmin(u, Role.MANDALAM_ADMIN)} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded font-bold border border-blue-100 hover:bg-blue-100">Mandalam Admin</button><button onClick={()=>handleAssignAdmin(u, Role.CUSTOM_ADMIN)} className="text-[10px] bg-slate-50 text-slate-700 px-2 py-1.5 rounded font-bold border border-slate-100 hover:bg-slate-100">Custom Admin</button></>)}{u.role !== Role.USER && (<button onClick={()=>handleAssignAdmin(u, Role.USER)} className="text-[10px] bg-red-50 text-red-700 px-2 py-1.5 rounded font-bold border border-red-100 hover:bg-red-100">Revoke Access</button>)}</div></div>))}</div></div></div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Reg Questions' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="bg-white p-6 rounded-xl border border-slate-200"><div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-lg text-slate-900">Registration Questions</h3><p className="text-slate-500 text-sm">Manage the questions shown during member sign-up.</p></div><div className="flex gap-3"><button onClick={async () => { if(confirm("Reset to default recommended questions? This will erase custom questions.")) { await StorageService.seedDefaultQuestions(); setQuestions(await StorageService.getQuestions()); } }} className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"><RefreshCw className="w-3 h-3"/> Reset Defaults</button><button onClick={() => { setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1, options: [], systemMapping: 'NONE' }); setIsQuestionModalOpen(true); }} className="flex items-center gap-2 text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-primary-dark transition-colors"><Plus className="w-3 h-3"/> Add Question</button></div></div><div className="space-y-3">{questions.map((q, idx) => (<div key={q.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors bg-white shadow-sm"><div className="flex items-center gap-4"><span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{idx + 1}</span><div><p className="font-bold text-slate-800 text-sm">{q.label} {q.required && <span className="text-red-500">*</span>}</p><div className="flex gap-2 mt-1"><span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{q.type}</span>{q.systemMapping !== 'NONE' && <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded">Mapped: {q.systemMapping}</span>}</div></div></div><div className="flex gap-2"><button onClick={() => { setQuestionForm(q); setIsQuestionModalOpen(true); }} className="p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button><button onClick={async () => { if(confirm("Delete this question permanently?")) { await StorageService.deleteQuestion(q.id); setQuestions(await StorageService.getQuestions()); } }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'New Year' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6"><div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm"><div className="text-center max-w-md w-full"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Calendar className="w-10 h-10" /></div><h3 className="text-2xl font-bold text-slate-900 mb-2">Fiscal Year Management</h3><p className="text-slate-500 mb-8 leading-relaxed">Start a new financial year to archive current records and reset all member payment statuses to <span className="font-bold text-red-500">Unpaid</span>.</p><div className="flex flex-col gap-4"><div className="flex gap-2 justify-center items-center"><label className="text-sm font-bold text-slate-600">New Fiscal Year:</label><input type="number" className="border p-2 rounded-lg w-32 text-center font-bold text-lg" value={newYearInput} onChange={(e) => setNewYearInput(e.target.value)} /></div><button onClick={handleStartNewYear} disabled={isProcessingYear} className="w-full px-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed">{isProcessingYear ? (<span className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</span>) : 'Start New Fiscal Year'}</button></div></div></div><div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="p-4 bg-slate-50 border-b font-bold text-slate-700">Year History</div>{years.map(y => (<div key={y.year} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-slate-50"><div className="flex items-center gap-3"><span className="font-bold text-lg text-slate-800">{y.year}</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${y.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{y.status}</span></div><button onClick={() => handleDeleteYear(y.year)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Year"><Trash2 className="w-4 h-4" /></button></div>))}{years.length === 0 && <div className="p-6 text-center text-slate-400">No year history found.</div>}</div></div>
      )}

      {/* ... (Keep other tabs) ... */}
      {activeTab === 'Card Mgmt' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-6"><div><h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary" /> ID Card Designer</h3><p className="text-slate-500 text-sm mt-1">Upload distinct designs for Card 1 (Front/Main) and Card 2 (Back/Certificate).</p></div><div className="flex gap-4"><div className="bg-slate-100 rounded-lg p-1 flex"><button onClick={() => setActiveCardSide('front')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'front' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Card Design 1</button><button onClick={() => setActiveCardSide('back')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'back' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Card Design 2</button></div><label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-colors text-sm"><ImagePlus className="w-4 h-4" />{isUploadingTemplate ? 'Uploading...' : 'Upload Template'}<input type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} disabled={isUploadingTemplate} /></label></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 bg-slate-100 rounded-xl p-4 border border-slate-200 flex items-center justify-center min-h-[400px] select-none relative overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>{cardConfig && cardConfig[activeCardSide].templateImage ? (<div className="relative shadow-2xl inline-block"><img ref={cardImageRef} src={cardConfig[activeCardSide].templateImage} alt="Card Template" className="max-w-full h-auto rounded-lg pointer-events-none" />{cardConfig[activeCardSide].fields.map(field => (<div key={field.id} onMouseDown={(e) => handleDragStart(e, field.id)} style={{ position: 'absolute', left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)', color: field.color, fontSize: `${field.fontSize}px`, fontWeight: field.fontWeight, whiteSpace: 'nowrap', cursor: 'move', border: draggedFieldId === field.id ? '2px dashed #3b82f6' : '1px dashed transparent', padding: '4px', zIndex: 10, userSelect: 'none' }} className="hover:border-slate-400 hover:bg-white/20 transition-all rounded">{field.type === 'QR' ? (<div className="w-16 h-16 bg-white flex items-center justify-center border border-slate-300"><QrCode className="w-10 h-10 text-slate-800" /></div>) : field.sampleValue}</div>))}</div>) : (<div className="text-center text-slate-400"><LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No template uploaded for {activeCardSide === 'front' ? 'Card 1' : 'Card 2'}.</p></div>)}</div><div className="space-y-6"><div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><h4 className="font-bold text-slate-800 text-sm mb-3">Add Variable to {activeCardSide === 'front' ? 'Card 1' : 'Card 2'}</h4><div className="flex gap-2"><select className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none" value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)}><option value="">-- Select Variable --</option><option value="membershipNo">Registration No (ID)</option><option value="registrationDate">Joined Date</option><option value="qr_code_verify" className="font-bold">🔳 QR Code (Verification)</option><optgroup label="Registration Questions">{questions.map(q => (<option key={q.id} value={q.id}>{q.label}</option>))}</optgroup></select><button onClick={addCardVariable} disabled={!selectedVariable} className="px-3 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-50">Add</button></div></div><div className="space-y-3 max-h-[400px] overflow-y-auto">{cardConfig?.[activeCardSide].fields.map(field => (<div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200"><div className="flex justify-between items-center mb-1"><span className="font-bold text-xs flex items-center gap-1 truncate max-w-[150px]">{field.type === 'QR' && <QrCode className="w-3 h-3 text-blue-500" />}{field.label}</span><button onClick={() => deleteCardField(field.id)} className="text-red-400"><X className="w-3 h-3"/></button></div><div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2 rounded"><div><label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">X Pos (%)</label><input type="number" className="w-full text-xs border rounded p-1 outline-none focus:border-primary" value={Math.round(field.x)} onChange={(e) => updateCardField(field.id, { x: Number(e.target.value) })} /></div><div><label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Y Pos (%)</label><input type="number" className="w-full text-xs border rounded p-1 outline-none focus:border-primary" value={Math.round(field.y)} onChange={(e) => updateCardField(field.id, { y: Number(e.target.value) })} /></div></div>{field.type !== 'QR' && (<div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Size (px)</label><input type="number" className="w-full text-xs border rounded p-1 outline-none focus:border-primary" value={field.fontSize} onChange={(e) => updateCardField(field.id, { fontSize: Number(e.target.value) })} /></div><div><label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Color</label><input type="color" className="w-full h-7 border rounded p-0 cursor-pointer" value={field.color} onChange={(e) => updateCardField(field.id, { color: e.target.value })} /></div></div>)}</div>))}</div></div></div></div></div>
      )}

      {/* --- ADMIN ASSIGN MODALS --- */}
      {showMandalamModal && selectedUserForAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">Assign Mandalam Admin</h3>
                  <p className="text-sm text-slate-500 mb-3">Select the mandalam(s) this admin manages:</p>
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      {MANDALAMS.map(m => (
                          <label key={m} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={assignMandalamSel.includes(m as Mandalam)}
                                  onChange={(e) => {
                                      if (e.target.checked) setAssignMandalamSel([...assignMandalamSel, m as Mandalam]);
                                      else setAssignMandalamSel(assignMandalamSel.filter(x => x !== m));
                                  }}
                              />
                              <span className="text-sm">{m}</span>
                          </label>
                      ))}
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowMandalamModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cancel</button>
                      <button onClick={saveAdminAssignment} disabled={isAssigningAdmin} className="px-4 py-2 bg-primary text-white rounded font-bold text-sm">
                          {isAssigningAdmin ? 'Saving...' : 'Save Access'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showCustomModal && selectedUserForAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Assign Custom Admin</h3>
                  <div className="mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Permissions</p>
                      <div className="grid grid-cols-2 gap-2">
                          {ADMIN_PERMISSIONS.map(p => (
                              <label key={p.id} className="flex items-center gap-2 p-2 border rounded text-xs cursor-pointer hover:bg-slate-50">
                                  <input 
                                      type="checkbox" 
                                      checked={customPerms.includes(p.id)}
                                      onChange={e => {
                                          if(e.target.checked) setCustomPerms([...customPerms, p.id]);
                                          else setCustomPerms(customPerms.filter(x => x !== p.id));
                                      }}
                                  />
                                  {p.label}
                              </label>
                          ))}
                      </div>
                  </div>
                  <div className="mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Scope (Optional)</p>
                      <select 
                          multiple 
                          className="w-full border p-2 rounded text-sm h-24"
                          value={customMandalams}
                          onChange={e => setCustomMandalams(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as Mandalam))}
                      >
                          {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple.</p>
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowCustomModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cancel</button>
                      <button onClick={saveAdminAssignment} disabled={isAssigningAdmin} className="px-4 py-2 bg-primary text-white rounded font-bold text-sm">
                          {isAssigningAdmin ? 'Saving...' : 'Save Role'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- BENEFIT MODAL (RESTORED) --- */}
      {isBenefitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-bold text-lg">Add New Benefit</h3>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Select Member</label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input 
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                            placeholder="Search by name or reg no..."
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {searchTerm && (
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-slate-50">
                            {filteredList.slice(0, 5).map(u => (
                                <div 
                                    key={u.id} 
                                    onClick={() => { setBenefitForm({...benefitForm, userId: u.id}); setSearchTerm(''); }}
                                    className={`p-2 text-xs cursor-pointer hover:bg-blue-50 ${benefitForm.userId === u.id ? 'bg-blue-100 text-primary font-bold' : ''}`}
                                >
                                    {u.fullName} ({u.membershipNo})
                                </div>
                            ))}
                        </div>
                    )}
                    {benefitForm.userId && (
                        <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded">
                            Selected: {users.find(u => u.id === benefitForm.userId)?.fullName}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Benefit Type</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={benefitForm.type}
                            onChange={(e) => setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}
                        >
                            {Object.values(BenefitType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Amount (AED)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded text-sm"
                            value={benefitForm.amount}
                            onChange={(e) => setBenefitForm({...benefitForm, amount: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label>
                    <input 
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Details..."
                        value={benefitForm.remarks}
                        onChange={(e) => setBenefitForm({...benefitForm, remarks: e.target.value})}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setIsBenefitModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded text-sm font-bold">Cancel</button>
                    <button onClick={handleAddBenefitSubmit} className="px-4 py-2 bg-primary text-white rounded text-sm font-bold">Add Benefit</button>
                </div>
            </div>
        </div>
      )}

      {/* ... (Keep View Proof Modal) ... */}
      {viewProofUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setViewProofUrl(null)}>
              <div className="bg-white p-2 rounded-xl max-w-4xl max-h-[90vh] overflow-auto relative">
                  <button onClick={() => setViewProofUrl(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><X className="w-6 h-6"/></button>
                  <img src={viewProofUrl} alt="Payment Proof" className="max-w-full h-auto rounded-lg" onClick={e => e.stopPropagation()}/>
              </div>
          </div>
      )}

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                         {viewingUser.photoUrl ? (<img src={viewingUser.photoUrl} className="w-12 h-12 rounded-full object-cover border" />) : (<div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">{viewingUser.fullName.charAt(0)}</div>)}
                         <div><h3 className="text-xl font-bold text-slate-900">{viewingUser.fullName}</h3><p className="text-sm text-slate-500 font-mono">{viewingUser.membershipNo}</p></div>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Lock className="w-3 h-3" /> Login Credentials</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-slate-400">Username / Email</p><p className="font-medium text-sm select-all">{viewingUser.email || viewingUser.mobile}</p></div>
                            <div><p className="text-xs text-slate-400">Password</p><p className="font-mono font-bold text-sm bg-white border px-2 py-1 rounded w-fit select-all text-red-600 border-red-100">{viewingUser.password || '******'}</p></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div><p className="text-xs text-slate-400">Mobile</p><p className="font-medium">{viewingUser.mobile}</p></div>
                        <div><p className="text-xs text-slate-400">WhatsApp</p><p className="font-medium">{viewingUser.whatsapp}</p></div>
                        <div><p className="text-xs text-slate-400">Emirates ID</p><p className="font-medium">{viewingUser.emiratesId}</p></div>
                        <div><p className="text-xs text-slate-400">Status</p><span className={`px-2 py-0.5 rounded text-xs font-bold ${viewingUser.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{viewingUser.status}</span></div>
                        <div><p className="text-xs text-slate-400">Payment</p><span className={`px-2 py-0.5 rounded text-xs font-bold ${viewingUser.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{viewingUser.paymentStatus}</span></div>
                        <div><p className="text-xs text-slate-400">Mandalam</p><p className="font-medium">{viewingUser.mandalam}</p></div>
                        
                        {/* Explicitly show all standard extended fields */}
                        {viewingUser.addressUAE && (<div><p className="text-xs text-slate-400">UAE Address</p><p className="font-medium text-slate-700 break-words">{viewingUser.addressUAE}</p></div>)}
                        {viewingUser.addressIndia && (<div><p className="text-xs text-slate-400">India Address</p><p className="font-medium text-slate-700 break-words">{viewingUser.addressIndia}</p></div>)}
                        {viewingUser.nominee && (<div><p className="text-xs text-slate-400">Nominee ({viewingUser.relation})</p><p className="font-medium text-slate-700">{viewingUser.nominee}</p></div>)}
                        {viewingUser.recommendedBy && (<div><p className="text-xs text-slate-400">Recommended By</p><p className="font-medium text-slate-700">{viewingUser.recommendedBy}</p></div>)}
                        {viewingUser.isKMCCMember && (<div><p className="text-xs text-slate-400">KMCC Member</p><p className="font-medium text-slate-700">Yes {viewingUser.kmccNo ? `(#${viewingUser.kmccNo})` : ''}</p></div>)}
                    </div>
                    {viewingUser.customData && (<div className="border-t pt-4"><h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Additional Details</h4><div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">{Object.entries(viewingUser.customData).map(([key, val]) => { 
                        // Filter out keys already shown above
                        const label = questions.find(q=>q.id===key)?.label || key;
                        if(['email','mobile','emirates id', 'uae address', 'india address', 'nominee', 'relation', 'kmcc', 'recommended'].some(k => label.toLowerCase().includes(k))) return null;
                        
                        return (<div key={key}><p className="text-xs text-slate-400">{label}</p><p className="font-medium text-slate-700 break-words">{val as string}</p></div>);
                    })}</div></div>)}
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    <button onClick={() => { setEditUserForm(viewingUser); setViewingUser(null); setShowEditUserModal(true); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100 text-sm">Edit User</button>
                    <button onClick={() => setViewingUser(null)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 text-sm">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* ... (Keep Reply Modal - Simplified for Chat flow) ... */}
      {replyMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Reply to {resolveUserName(replyMessage.userId, replyMessage.userName)}</h3><button onClick={() => setReplyMessage(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
                  <div className="mb-4 bg-slate-50 p-3 rounded text-sm text-slate-600 italic border border-slate-100">"{replyMessage.content}"</div>
                  <textarea className="w-full p-3 border rounded-lg h-32 text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Type your reply here..." value={replyContent} onChange={e => setReplyContent(e.target.value)}/>
                  <div className="flex justify-end gap-2"><button onClick={() => setReplyMessage(null)} className="px-4 py-2 bg-slate-100 rounded text-sm font-bold">Cancel</button><button onClick={handleReplyMessage} className="px-4 py-2 bg-primary text-white rounded text-sm font-bold flex items-center gap-2"><Send className="w-3 h-3" /> Send Reply</button></div>
              </div>
          </div>
      )}

      {showEditUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white w-full max-w-2xl rounded-xl p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-bold text-lg text-slate-900">Edit User Details</h3><button onClick={() => setShowEditUserModal(false)}><X className="w-5 h-5 text-slate-400"/></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label><input className="w-full border p-2 rounded text-sm" value={editUserForm.fullName || ''} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Mobile</label><input className="w-full border p-2 rounded text-sm" value={editUserForm.mobile || ''} onChange={e => setEditUserForm({...editUserForm, mobile: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input className="w-full border p-2 rounded text-sm" value={editUserForm.email || ''} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Emirates ID</label><input className="w-full border p-2 rounded text-sm" value={editUserForm.emiratesId || ''} onChange={e => setEditUserForm({...editUserForm, emiratesId: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Password</label><input className="w-full border p-2 rounded text-sm" value={editUserForm.password || ''} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Mandalam</label><select className="w-full border p-2 rounded text-sm bg-white" value={editUserForm.mandalam} onChange={e => setEditUserForm({...editUserForm, mandalam: e.target.value as Mandalam})}>{MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Status</label><select className="w-full border p-2 rounded text-sm bg-white" value={editUserForm.status} onChange={e => setEditUserForm({...editUserForm, status: e.target.value as UserStatus})}>{Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>{questions.map(q => { if (['fullName','mobile','email','password','emiratesId','mandalam'].includes(q.systemMapping || '')) return null; let val = ''; if (q.systemMapping && q.systemMapping !== 'NONE') { val = (editUserForm as any)[q.systemMapping] || ''; } else { val = editUserForm.customData?.[q.id] || ''; } return (<div key={q.id} className={q.type === FieldType.TEXTAREA ? "col-span-2" : ""}><label className="block text-xs font-bold text-slate-500 mb-1">{q.label}</label>{q.type === FieldType.TEXTAREA ? (<textarea className="w-full border p-2 rounded text-sm h-20 resize-none" value={val} onChange={e => { const newVal = e.target.value; if (q.systemMapping && q.systemMapping !== 'NONE') { setEditUserForm({...editUserForm, [q.systemMapping]: newVal}); } else { setEditUserForm({...editUserForm, customData: { ...editUserForm.customData, [q.id]: newVal }}); } }} />) : (<input className="w-full border p-2 rounded text-sm" value={val} onChange={e => { const newVal = e.target.value; if (q.systemMapping && q.systemMapping !== 'NONE') { setEditUserForm({...editUserForm, [q.systemMapping]: newVal}); } else { setEditUserForm({...editUserForm, customData: { ...editUserForm.customData, [q.id]: newVal }}); } }} />)}</div>); })}</div><div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowEditUserModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button><button onClick={saveEditUser} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Save Changes</button></div></div></div>
      )}

      {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto"><h3 className="font-bold text-lg mb-4">Add New User</h3><div className="grid grid-cols-1 gap-4"><input className="border p-2 rounded" placeholder="Full Name *" value={newUserForm.fullName || ''} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} /><input className="border p-2 rounded" placeholder="Mobile *" value={newUserForm.mobile || ''} onChange={e => setNewUserForm({...newUserForm, mobile: e.target.value})} /><input className="border p-2 rounded" placeholder="Emirates ID" value={newUserForm.emiratesId || ''} onChange={e => setNewUserForm({...newUserForm, emiratesId: e.target.value})} /><input className="border p-2 rounded" placeholder="Email" value={newUserForm.email || ''} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} /><select className="border p-2 rounded" value={newUserForm.mandalam} onChange={e => setNewUserForm({...newUserForm, mandalam: e.target.value as Mandalam})}>{MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button><button onClick={handleAddNewUser} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Add User</button></div></div></div>
      )}

    </div>
  );
};

export default AdminDashboard;

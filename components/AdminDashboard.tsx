
import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification, Message, CardConfig, CardField, Sponsor, NewsEvent } from '../types';
import { Search, Trash2, Eye, Plus, Calendar, Edit, X, Check, ArrowUp, ArrowDown, Wallet, LayoutTemplate, ImagePlus, RefreshCw, AlertCircle, FileUp, Move, Save, BarChart3, PieChart, ShieldAlert, Lock, Download, UserPlus, XCircle, CheckCircle2, QrCode, ShieldCheck, UserCheck, Building2, BellRing, Mail, Copy, Send, Settings, CheckCircle, Smartphone, RotateCcw, MessageSquare, Reply, Globe, MapPin, HeartHandshake, Link as LinkIcon, Image as ImageIcon, MessageCircle, Clock, ChevronRight, User as UserIcon, FileSpreadsheet, ArrowRight, MinusSquare, CheckSquare, Square } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS } from '../constants';

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

// Tabs List
const ALL_TABS = [
  'User Approvals', 'Users Overview', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Messages', 'News & Events', 'Sponsors', 
  'Import Users', 'Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt'
];

// Dynamic Import Configuration
interface ImportConfig {
    fieldMapping: Record<string, string>; // Maps Question ID -> CSV Header
    registrationDateColumn: string; // Specific mapping for Join Date
    passwordSource: 'COLUMN' | 'DEFAULT';
    passwordColumn: string;
    defaultPassword: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, messages = [], years, sponsors = [], newsEvents = [], stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, onSwitchToUserView, isLoading }) => {
  const [activeTab, setActiveTab] = useState('User Approvals');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  
  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modal States
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showMandalamModal, setShowMandalamModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
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
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  
  // -- IMPORT WIZARD STATE --
  const [importStep, setImportStep] = useState<'UPLOAD' | 'MAP' | 'PROCESS' | 'RESULT'>('UPLOAD');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [fullCsvData, setFullCsvData] = useState<string[][]>([]);
  const [importLog, setImportLog] = useState<{success: number, errors: string[]}>({ success: 0, errors: [] });
  
  const [importConfig, setImportConfig] = useState<ImportConfig>({
      fieldMapping: {},
      registrationDateColumn: '',
      passwordSource: 'DEFAULT', 
      passwordColumn: '', 
      defaultPassword: 'Member@123'
  });
  
  // New Year processing state
  const [isProcessingYear, setIsProcessingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState<string>(String(new Date().getFullYear() + 1));

  // Forms
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [notifLink, setNotifLink] = useState('');
  const [notifImage, setNotifImage] = useState('');
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
    setSelectedUserIds([]); // Clear selection on tab change
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

  // --- HELPER: Image Resizer to prevent Firestore 1MB Limit Errors ---
  const resizeImage = (file: File, maxDim: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
          } else {
              reject(new Error("Canvas error"));
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const getGroupedMessages = () => {
      const groups: { [key: string]: { userId: string, messages: Message[], unreadCount: number, latestDate: Date } } = {};
      
      messages.forEach(msg => {
        if (!groups[msg.userId]) {
          groups[msg.userId] = { 
            userId: msg.userId, 
            messages: [], 
            unreadCount: 0, 
            latestDate: new Date(0) 
          };
        }
        groups[msg.userId].messages.push(msg);
        // Assuming status 'NEW' means unread by admin if it's from user, or just new thread.
        // Adjust logic if needed based on 'status' field usage in UserDashboard
        if (msg.status === 'NEW' && !msg.adminReply) {
          groups[msg.userId].unreadCount++;
        }
        const msgDate = new Date(msg.date);
        if (msgDate > groups[msg.userId].latestDate) {
          groups[msg.userId].latestDate = msgDate;
        }
      });
  
      return Object.values(groups).sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  };

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

  // --- EXPORT FUNCTIONALITY ---
  const handleExportCSV = async () => {
      const allQuestions = await StorageService.getQuestions();
      
      // Headers
      const headers = [
        "ID", "Membership No", "Full Name", "Mobile", "Email", "Emirates ID", 
        "Mandalam", "Emirate", "Status", "Payment Status", "Year", "Join Date", "Approved By",
        ...allQuestions.map(q => q.label)
      ];

      // Rows
      const rows = filteredList.map(u => {
        const basicData = [
           u.id, u.membershipNo, u.fullName, u.mobile, u.email, u.emiratesId,
           u.mandalam, u.emirate, u.status, u.paymentStatus, u.registrationYear, u.registrationDate, u.approvedBy
        ];
        
        const dynamicData = allQuestions.map(q => {
           let val: any = '';
           if (q.systemMapping && q.systemMapping !== 'NONE') {
               val = (u as any)[q.systemMapping];
           } else if (u.customData) {
               val = u.customData[q.id];
           }
           
           if (typeof val === 'boolean') return val ? 'Yes' : 'No';
           if (!val) return '';
           return `"${String(val).replace(/"/g, '""')}"`; // Escape quotes
        });
        
        return [...basicData.map(v => `"${String(v || '').replace(/"/g, '""')}"`), ...dynamicData].join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Member_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSaveQuestion = async () => {
      if (!questionForm.label) return alert("Question Label is required");
      
      const id = questionForm.id || `q_${Date.now()}`;
      const finalQuestion: RegistrationQuestion = {
          id,
          label: questionForm.label,
          type: questionForm.type || FieldType.TEXT,
          required: questionForm.required || false,
          order: questionForm.order || questions.length + 1,
          options: Array.isArray(questionForm.options) 
              ? questionForm.options.filter(o => o.trim() !== '')
              : [],
          systemMapping: questionForm.systemMapping || 'NONE',
          placeholder: questionForm.placeholder
      };

      try {
          await StorageService.saveQuestion(finalQuestion);
          setQuestions(await StorageService.getQuestions());
          setIsQuestionModalOpen(false);
          setQuestionForm({});
      } catch (e) {
          console.error(e);
          alert("Failed to save question.");
      }
  };

  // --- SELECTION LOGIC ---
  const handleSelectAll = () => {
      if (selectedUserIds.length === filteredList.length) {
          setSelectedUserIds([]);
      } else {
          setSelectedUserIds(filteredList.map(u => u.id));
      }
  };

  const handleSelectRow = (id: string) => {
      if (selectedUserIds.includes(id)) {
          setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
      } else {
          setSelectedUserIds([...selectedUserIds, id]);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedUserIds.length === 0) return;
      if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedUserIds.length} users? This cannot be undone.`)) return;
      
      try {
          await StorageService.deleteUsers(selectedUserIds);
          setSelectedUserIds([]);
          alert("Selected users deleted successfully.");
      } catch (e) {
          console.error(e);
          alert("An error occurred during bulk deletion.");
      }
  };

  // ... (Approval handlers, Payment handlers - kept implicitly)
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
  const handleRemindUnpaid = async () => { alert("Simulated: Notifications sent to all unpaid members."); };
  const getUnpaidEmails = () => authorizedUsers.filter(u => u.role === Role.USER && u.paymentStatus !== PaymentStatus.PAID && u.email && u.email.includes('@')).map(u => u.email as string);
  const handleOpenEmailModal = () => { if (getUnpaidEmails().length === 0) { alert("No unpaid members with valid email addresses found."); return; } setShowEmailReminderModal(true); };
  
  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      onAddBenefit({ id: `benefit-${Date.now()}`, userId: benefitForm.userId, userName: user?.fullName, regNo: user?.membershipNo, type: benefitForm.type, amount: Number(benefitForm.amount), remarks: benefitForm.remarks, date: new Date().toLocaleDateString() });
      setIsBenefitModalOpen(false); setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
  };

  const handleNotifImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try {
          const resized = await resizeImage(file);
          setNotifImage(resized);
      } catch (e) {
          alert("Image processing failed.");
      }
  };

  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) return alert("Enter title and message");
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          let audienceLabel = 'All Members';
          
          if (notifTarget === 'ALL') {
              recipients = undefined;
              audienceLabel = 'All Members';
          } 
          else if (notifTarget !== 'ALL') { 
              recipients = users.filter(u => u.mandalam === notifTarget).map(u => u.id); 
              audienceLabel = `${notifTarget} Members`; 
          } 
          else if (currentUser.role === Role.MANDALAM_ADMIN) { 
              recipients = authorizedUsers.map(u => u.id); 
              audienceLabel = 'My Members'; 
          }

          const newNotification: Notification = { 
              id: `notif-${Date.now()}`, 
              title: notifTitle, 
              message: notifMessage, 
              date: new Date().toLocaleDateString(), 
              read: false, 
              type: recipients ? 'INDIVIDUAL' : 'BROADCAST', 
              targetAudience: audienceLabel, 
              recipients,
              imageUrl: notifImage,
              link: notifLink
          };
          await StorageService.addNotification(newNotification); alert("Notification Sent!"); 
          setNotifTitle(''); setNotifMessage(''); setNotifImage(''); setNotifLink('');
      } catch (e: any) { alert("Error sending notification: " + e.message); } finally { setSendingNotif(false); }
  };

  const handleReplyMessage = async () => {
      if (!replyMessage || !replyContent) return;
      try {
          await StorageService.markMessageReplied(replyMessage.id, replyContent);
          setReplyMessage(null); 
          setReplyContent(''); 
          alert("Reply sent successfully.");
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

  // --- IMPORT WIZARD LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCsvFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          if (!text) return;
          const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
          if (lines.length === 0) return alert("Empty CSV");
          const headers = lines[0].split(',').map(h => h.trim());
          const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
          setCsvHeaders(headers);
          setCsvPreview(rows.slice(0, 5));
          setFullCsvData(rows);
          setImportStep('MAP');
          const newMapping: Record<string, string> = {};
          let regDateCol = '';
          questions.forEach(q => {
              const match = headers.find(h => {
                  const headerLower = h.toLowerCase().replace(/_/g, '').replace(/ /g, '');
                  const labelLower = q.label.toLowerCase().replace(/_/g, '').replace(/ /g, '');
                  const keyLower = q.systemMapping?.toLowerCase().replace(/_/g, '') || '___';
                  return headerLower === labelLower || headerLower === keyLower || headerLower.includes(labelLower);
              });
              if (match) newMapping[q.id] = match;
          });
          const dateMatch = headers.find(h => {
              const hl = h.toLowerCase();
              return hl.includes('join') || (hl.includes('date') && (hl.includes('reg') || hl.includes('join')));
          });
          if (dateMatch) regDateCol = dateMatch;
          setImportConfig({
              ...importConfig,
              fieldMapping: newMapping,
              registrationDateColumn: regDateCol
          });
      };
      reader.readAsText(file);
  };

  const handleStartImport = async () => {
      if (!fullCsvData.length) return;
      setImportStep('PROCESS');
      setImportLog({ success: 0, errors: [] });
      const currentYear = new Date().getFullYear();
      const newUsers: User[] = [];
      const errors: string[] = [];
      let seqStart = 1;
      try {
          seqStart = await StorageService.getNextSequence(currentYear);
      } catch (e) { console.error("Seq error", e); }

      fullCsvData.forEach((row, idx) => {
          const rowNum = idx + 2; 
          const getValue = (headerName: string) => {
              const index = csvHeaders.indexOf(headerName);
              if (index === -1) return '';
              return row[index] || '';
          };
          const newUser: User = {
              id: `imp-${Date.now()}-${idx}`,
              fullName: '', mobile: '', email: '', emiratesId: '',
              mandalam: Mandalam.VATAKARA, emirate: Emirate.DUBAI,
              registrationDate: getValue(importConfig.registrationDateColumn) || new Date().toLocaleDateString(),
              whatsapp: '', role: Role.USER, status: UserStatus.APPROVED, paymentStatus: PaymentStatus.UNPAID,
              registrationYear: currentYear, photoUrl: '', membershipNo: '',
              password: importConfig.defaultPassword, isImported: true, source: 'IMPORT', customData: {}
          };
          questions.forEach(q => {
              const header = importConfig.fieldMapping[q.id];
              if (!header) return;
              const rawValue = getValue(header);
              if (!rawValue) return;
              if (q.systemMapping && q.systemMapping !== 'NONE') {
                  if (q.systemMapping === 'mandalam') {
                      const m = Object.values(Mandalam).find(v => v.toLowerCase() === rawValue.toLowerCase());
                      if (m) newUser.mandalam = m;
                  } else if (q.systemMapping === 'emirate') {
                      const e = Object.values(Emirate).find(v => v.toLowerCase() === rawValue.toLowerCase());
                      if (e) newUser.emirate = e;
                  } else { (newUser as any)[q.systemMapping] = rawValue; }
              } else {
                  if (!newUser.customData) newUser.customData = {};
                  newUser.customData[q.id] = rawValue;
              }
          });
          if (!newUser.fullName) { errors.push(`Row ${rowNum}: Skipped - Missing Name`); return; }
          if (!newUser.mobile) { errors.push(`Row ${rowNum}: Skipped - Missing Mobile`); return; }
          if (!newUser.emiratesId) newUser.emiratesId = `TEMP-${Date.now()}-${idx}`;
          if (!newUser.whatsapp) newUser.whatsapp = newUser.mobile;
          if (importConfig.passwordSource === 'COLUMN' && importConfig.passwordColumn) {
              const pwdVal = getValue(importConfig.passwordColumn);
              if (pwdVal) newUser.password = pwdVal;
          }
          const seq = seqStart + newUsers.length;
          newUser.membershipNo = `${currentYear}${seq.toString().padStart(4, '0')}`;
          newUsers.push(newUser);
      });
      if (newUsers.length > 0) {
          try {
              await StorageService.addUsers(newUsers);
              setImportLog({ success: newUsers.length, errors });
          } catch (e: any) {
              setImportLog({ success: 0, errors: [`CRITICAL ERROR: ${e.message}`] });
          }
      } else {
          setImportLog({ success: 0, errors: [...errors, "No valid users found to import."] });
      }
      setImportStep('RESULT');
  };

  const resetImport = () => {
      setCsvFile(null); setCsvHeaders([]); setFullCsvData([]); setImportStep('UPLOAD');
      setImportConfig({ fieldMapping: {}, registrationDateColumn: '', passwordSource: 'DEFAULT', passwordColumn: '', defaultPassword: 'Member@123' });
  };

  const handleStartNewYear = async () => {
      const year = parseInt(newYearInput, 10);
      if(isNaN(year) || year < 2024 || year > 2050) return alert("Invalid year");
      if(!confirm(`Start Year ${year}?`)) return;
      setIsProcessingYear(true);
      try { await StorageService.createNewYear(year); await StorageService.resetAllUserPayments(year); alert(`Year ${year} started.`); setNewYearInput(String(year + 1)); } catch (e: any) { alert("Failed."); } finally { setIsProcessingYear(false); }
  };

  const handleDeleteYear = async (year: number) => {
      if(!confirm(`Are you sure you want to delete records for year ${year}?`)) return;
      await StorageService.deleteYear(year);
  };

  const saveEditUser = async () => { if (!editUserForm.id) return; await onUpdateUser(editUserForm.id, { ...editUserForm }); setShowEditUserModal(false); setEditUserForm({}); };
  
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      setIsUploadingTemplate(true);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          // Optimistically compress for faster save and load
          const img = new Image();
          img.src = rawBase64;
          img.onload = async () => {
              // Resize logic embedded for quick fix
              const canvas = document.createElement('canvas');
              const maxDim = 1200; 
              let width = img.width;
              let height = img.height;
              if (width > height) { if (width > maxDim) { height *= maxDim / width; width = maxDim; } } 
              else { if (height > maxDim) { width *= maxDim / height; height = maxDim; } }
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

              const currentConfig = cardConfig || { front: { templateImage: '', fields: [], width: 800, height: 500 }, back: { templateImage: '', fields: [], width: 800, height: 500 } };
              const updatedSide = { ...currentConfig[activeCardSide], templateImage: compressedBase64, width: img.width, height: img.height };
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
      try {
          const resized = await resizeImage(file);
          await StorageService.addSponsor({ id: `sponsor-${Date.now()}`, name: sponsorForm.name!, logoUrl: resized, website: sponsorForm.website || '' });
          setSponsorForm({}); 
      } catch (e) {
          alert("Failed to process image.");
      } finally {
          setIsUploadingContent(false);
      }
  };

  const handleNewsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const resized = await resizeImage(file);
          setNewsForm({ ...newsForm, imageUrl: resized });
      } catch (e) {
          alert("Failed to upload image. Try a smaller file.");
      }
  };
  
  const handleAddNews = async () => {
      if(!newsForm.title || !newsForm.description) return alert("Title and Description required");
      setIsUploadingContent(true);
      try {
          await StorageService.addNewsEvent({ 
              id: `news-${Date.now()}`, 
              title: newsForm.title!, 
              description: newsForm.description!, 
              type: newsForm.type || 'NEWS', 
              date: newsForm.date || new Date().toLocaleDateString(), 
              imageUrl: newsForm.imageUrl, 
              location: newsForm.location, 
              link: newsForm.link 
          });
          setNewsForm({ type: 'NEWS', date: new Date().toISOString().split('T')[0] }); 
          alert("News published successfully!");
      } catch (e) {
          console.error(e);
          alert("Failed to publish news. If image is attached, it might be too large.");
      } finally {
          setIsUploadingContent(false);
      }
  };

  // ... (addCardVariable, updateCardField, etc. - kept implicitly)
  
  const addCardVariable = async () => {
      if (!selectedVariable) return;
      const currentConfig = cardConfig || { front: { templateImage: '', fields: [], width: 800, height: 500 }, back: { templateImage: '', fields: [], width: 800, height: 500 } };
      let label = "Unknown", key = selectedVariable, sample = "Sample Text", type: 'TEXT' | 'QR' = 'TEXT';
      if (key === 'membershipNo') { label = 'Registration No'; sample = '20250001'; } 
      else if (key === 'registrationDate') { label = 'Joined Date'; sample = '01/01/2025'; } 
      else if (key === 'qr_code_verify') { label = 'Verification QR Code'; sample = 'QR'; type = 'QR'; } 
      else { const q = questions.find(q => q.id === key); if (q) { label = q.label; key = (q.systemMapping && q.systemMapping !== 'NONE') ? q.systemMapping : q.id; sample = q.label; } }
      const newField: CardField = { id: `field-${Date.now()}`, label, key, x: 50, y: 50, fontSize: 14, color: '#000000', fontWeight: 'bold', sampleValue: sample, type: type as 'TEXT'|'QR' };
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
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const currentSide = cardConfig[activeCardSide];
      const newFields = currentSide.fields.map(f => f.id === draggedFieldId ? { ...f, x, y } : f);
      setCardConfig({ ...cardConfig, [activeCardSide]: { ...currentSide, fields: newFields } });
  };
  const handleMouseUp = async () => { if (draggedFieldId && cardConfig) { setDraggedFieldId(null); await StorageService.saveCardConfig(cardConfig); } };

  const StatCard = ({ label, value, colorClass }: { label: string, value: string | number, colorClass: string }) => (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-500 uppercase font-medium mt-1">{label}</p>
      </div>
  );

  const pendingPayments = filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING);
  const paymentHistory = filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID || (u.paymentStatus === PaymentStatus.UNPAID && u.paymentRemarks));
  const isSystemAdmin = currentUser.id === 'admin-master';
  const isMembershipPending = !isSystemAdmin && currentUser.paymentStatus !== PaymentStatus.PAID;
  const handleEditUserFieldChange = (key: string, value: any, isCustom: boolean = false) => {
      setEditUserForm(prev => {
          if (isCustom) { const currentCustom = prev.customData || {}; return { ...prev, customData: { ...currentCustom, [key]: value } }; } 
          else { return { ...prev, [key]: value }; }
      });
  };
  const handleMappingChange = (questionId: string, header: string) => { setImportConfig(prev => ({ ...prev, fieldMapping: { ...prev.fieldMapping, [questionId]: header } })); };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {isMembershipPending && (
          <div className="bg-gradient-to-r from-red-50 to-white border-l-4 border-red-500 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full text-red-600"><Wallet className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-red-800 text-sm">Action Required: Membership Fee Pending</h4><p className="text-xs text-red-600 mt-0.5">Your administrative account also requires membership renewal ({years[0]?.year || new Date().getFullYear()}).</p></div>
              </div>
              <button onClick={onSwitchToUserView} className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">Pay Membership Fee <ArrowUp className="w-3 h-3 rotate-45" /></button>
          </div>
      )}

      {/* ... (Header and Stats - kept implicitly) */}
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

      {/* ... (Notifications Tab, Messages Tab, Payment Tabs - kept implicitly) */}
      
      {activeTab === 'Notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ... (Notifications Content) */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><BellRing className="w-5 h-5 text-indigo-600" /> Send Notification</h3>
                  <div className="space-y-4">
                      <input className="w-full p-2 border rounded text-sm" placeholder="Title" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
                      <textarea className="w-full p-2 border rounded text-sm h-24 resize-none" placeholder="Message..." value={notifMessage} onChange={e => setNotifMessage(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                          <select className="p-2 border rounded text-sm bg-white" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}><option value="ALL">All Members</option>{MANDALAMS.map(m => <option key={m} value={m}>{m} Members</option>)}</select>
                          <input className="p-2 border rounded text-sm" placeholder="Link (Optional)" value={notifLink} onChange={e => setNotifLink(e.target.value)} />
                      </div>
                      <label className="flex items-center justify-center gap-2 w-full p-2 border border-dashed border-slate-300 rounded text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
                          <ImagePlus className="w-4 h-4" /> {notifImage ? 'Image Selected' : 'Upload Image (Optional)'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleNotifImageUpload} />
                      </label>
                      <button onClick={handleSendNotification} disabled={sendingNotif} className="w-full py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">{sendingNotif ? 'Sending...' : <><Send className="w-4 h-4" /> Send Broadcast</>}</button>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-h-[500px] overflow-y-auto">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Recent Notifications</h4>
                  <div className="space-y-3">
                      {notifications.map(n => (
                          <div key={n.id} className="p-3 border rounded hover:bg-slate-50 relative group">
                              <div className="flex justify-between items-start mb-1"><p className="font-bold text-sm text-slate-900">{n.title}</p><span className="text-[10px] text-slate-400">{n.date}</span></div>
                              <p className="text-xs text-slate-600 mb-1">{n.message}</p>
                              <div className="flex gap-2 text-[10px] text-slate-400"><span>To: {n.targetAudience}</span>{n.imageUrl && <span className="flex items-center gap-1 text-blue-500"><ImageIcon className="w-3 h-3"/> Image</span>}{n.link && <span className="flex items-center gap-1 text-blue-500"><LinkIcon className="w-3 h-3"/> Link</span>}</div>
                              <button onClick={() => onDeleteNotification(n.id)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      ))}
                      {notifications.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No history.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* ... (Messages Tab, Payment Tabs, User Approvals, Users Overview, Import Users, Admin Assign, Reg Questions, New Year - kept implicitly) */}
      
      {/* ... (Messages Tab) */}
      {activeTab === 'Messages' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row h-[700px] overflow-hidden">
              <div className={`${selectedChatUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-100 bg-slate-50`}>
                  <div className="p-4 border-b border-slate-100 bg-white">
                      <h3 className="font-bold text-slate-800 text-sm mb-3">Support Chats</h3>
                      <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-primary" placeholder="Search member..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      {getGroupedMessages().filter(g => resolveUserName(g.userId, 'Unknown').toLowerCase().includes(searchTerm.toLowerCase())).map(group => {
                          const name = resolveUserName(group.userId, 'Member');
                          const active = selectedChatUser === group.userId;
                          return (
                              <div key={group.userId} onClick={() => setSelectedChatUser(group.userId)} className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-white flex gap-3 ${active ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>{name.charAt(0)}</div>
                                  <div className="flex-1 min-w-0"><div className="flex justify-between items-baseline mb-1"><p className={`text-sm font-bold truncate ${active ? 'text-primary' : 'text-slate-800'}`}>{name}</p><span className="text-[10px] text-slate-400">{group.latestDate.toLocaleDateString()}</span></div><p className="text-xs text-slate-500 truncate">{group.messages[group.messages.length - 1].content}</p>{group.unreadCount > 0 && (<span className="mt-2 inline-block px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{group.unreadCount} New</span>)}</div>
                              </div>
                          );
                      })}
                      {getGroupedMessages().length === 0 && <div className="p-8 text-center text-xs text-slate-400">No conversations yet.</div>}
                  </div>
              </div>
              <div className={`${!selectedChatUser ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-white`}>
                  {selectedChatUser ? (
                      <>
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
                              <div className="flex items-center gap-3">
                                  <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2 text-slate-500"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                                  <div><h3 className="font-bold text-slate-900">{resolveUserName(selectedChatUser, 'Member')}</h3><p className="text-xs text-slate-500 font-mono">ID: {users.find(u => u.id === selectedChatUser)?.membershipNo || 'N/A'}</p></div>
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                              {messages.filter(m => m.userId === selectedChatUser).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(msg => (
                                  <div key={msg.id} className="space-y-4">
                                      <div className="flex gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mt-1 shrink-0">{resolveUserName(msg.userId, 'U').charAt(0)}</div>
                                          <div className="flex flex-col gap-1 max-w-[80%]"><span className="text-[10px] text-slate-400 font-bold ml-1">{msg.subject}</span><div className="bg-white border border-slate-200 p-4 rounded-r-xl rounded-bl-xl shadow-sm"><p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p><p className="text-[10px] text-slate-400 mt-2 text-right">{new Date(msg.date).toLocaleString()}</p></div></div>
                                      </div>
                                      {msg.adminReply ? (<div className="flex gap-3 justify-end"><div className="flex flex-col gap-1 items-end max-w-[80%]"><div className="bg-primary text-white p-4 rounded-l-xl rounded-br-xl shadow-sm"><p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.adminReply}</p></div><span className="text-[10px] text-slate-400 flex items-center gap-1">Replied <CheckCircle className="w-3 h-3 text-emerald-500"/></span></div><div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white mt-1 shrink-0">A</div></div>) : (<div className="flex justify-end pr-11"><button onClick={() => { setReplyMessage(msg); setReplyContent(`Hi ${resolveUserName(msg.userId, 'Member')},\n\n`); }} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm"><Reply className="w-3 h-3"/> Reply to this</button></div>)}
                                  </div>
                              ))}
                          </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><MessageSquare className="w-16 h-16 mb-4 opacity-20" /><p>Select a conversation to start chatting</p></div>
                  )}
              </div>
          </div>
      )}

      {/* ... (Payment Subs Tab, User Approvals Tab, Users Overview Tab, Payment Mgmt Tab, Benefits Tab, Import Users Tab, Admin Assign Tab, Reg Questions Tab, New Year Tab - kept implicitly) */}
      {activeTab === 'Payment Subs' && (
          <div className="space-y-6">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center"><h3 className="font-bold text-orange-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Pending Payment Approvals</h3><span className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-full">{pendingPayments.length} Requests</span></div><div className="divide-y divide-slate-100">{pendingPayments.length > 0 ? pendingPayments.map(u => (<div key={u.id} className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50"><div className="flex-1"><div className="flex items-center gap-3"><p className="font-bold text-slate-900">{u.fullName}</p><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{u.membershipNo}</span></div><div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3"><p className="text-xs text-blue-500 font-bold uppercase mb-1">Payment Remarks / Transaction ID</p><p className="text-sm text-slate-700 font-medium">"{u.paymentRemarks}"</p>{u.paymentProofUrl && <button onClick={() => setViewProofUrl(u.paymentProofUrl!)} className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 w-fit"><ImageIcon className="w-3 h-3"/> View Proof</button>}</div></div><div className="flex items-center gap-3 mt-4 md:mt-0 ml-4"><button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Eye className="w-5 h-5"/></button><button onClick={() => handleApprovePayment(u.id)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approve</button><button onClick={() => handleRejectPayment(u.id)} className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm font-bold rounded-lg hover:bg-red-50 flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</button></div></div>)) : (<div className="p-8 text-center text-slate-400 italic">No pending payment submissions.</div>)}</div></div>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 bg-slate-50 border-b border-slate-100"><h3 className="font-bold text-slate-700">Submission History</h3></div><div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">{paymentHistory.map(u => (<div key={u.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50"><div><p className="font-bold text-slate-900">{u.fullName}</p><p className="text-xs text-slate-500">{u.paymentRemarks}</p>{u.paymentProofUrl && <button onClick={() => setViewProofUrl(u.paymentProofUrl!)} className="text-[10px] text-blue-500 underline mt-1">View Proof</button>}</div><div className="text-right flex flex-col items-end gap-1">{u.paymentStatus === PaymentStatus.PAID ? (<div className="flex items-center gap-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">APPROVED</span><button onClick={() => handleRevokePayment(u.id)} className="text-orange-500 hover:text-orange-700" title="Revoke"><RotateCcw className="w-3 h-3" /></button></div>) : (<span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">REJECTED / UNPAID</span>)}<p className="text-[10px] text-slate-400 mt-1">{u.approvedBy ? `by ${u.approvedBy}` : ''}</p></div></div>))}{paymentHistory.length === 0 && <div className="p-6 text-center text-slate-400 text-xs">No history available.</div>}</div></div>
          </div>
      )}
      
      {activeTab === 'User Approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Pending Approvals</h3><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div></div>
             <table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Details</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredList.filter(u => u.status === UserStatus.PENDING).map(u => (<tr key={u.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div><p className="font-bold">{u.fullName}</p><p className="text-xs text-slate-500">{u.mobile}</p></div></td><td className="px-6 py-4 text-xs"><p>{u.mandalam}, {u.emirate}</p><p className="text-slate-400">Reg: {u.registrationDate}</p></td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => setViewingUser(u)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4" /></button><button onClick={() => handleApproveUser(u.id)} className="px-3 py-1 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700">Approve</button><button onClick={() => handleRejectUser(u.id)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded font-bold text-xs hover:bg-red-50">Reject</button></td></tr>))}{filteredList.filter(u => u.status === UserStatus.PENDING).length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending approvals</td></tr>}</tbody></table>
        </div>
      )}

      {activeTab === 'Users Overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-4">
                    {selectedUserIds.length > 0 ? (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <span className="text-sm font-bold text-slate-800">{selectedUserIds.length} Selected</span>
                            <button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Trash2 className="w-3 h-3" /> Delete Selected
                            </button>
                            <button onClick={() => setSelectedUserIds([])} className="text-xs text-slate-500 hover:underline">Cancel</button>
                        </div>
                    ) : (
                        <h3 className="font-bold text-slate-800">All Members Directory</h3>
                    )}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700"><Download className="w-4 h-4" /> Export CSV</button>
                    <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary w-full" placeholder="Search members..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3 w-10"><button onClick={handleSelectAll} className="flex items-center text-slate-400 hover:text-slate-600">{selectedUserIds.length > 0 && selectedUserIds.length === filteredList.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}</button></th><th className="px-6 py-3">Reg No</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredList.map(u => (<tr key={u.id} className={`hover:bg-slate-50 ${selectedUserIds.includes(u.id) ? 'bg-blue-50/50' : ''}`}><td className="px-6 py-4"><button onClick={() => handleSelectRow(u.id)} className="flex items-center text-slate-400 hover:text-slate-600">{selectedUserIds.includes(u.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}</button></td><td className="px-6 py-4 font-mono text-slate-600">{u.membershipNo}</td><td className="px-6 py-4"><div className="font-bold text-slate-900">{u.fullName}</div><div className="text-xs text-slate-500">{u.mandalam}, {u.emirate}</div></td><td className="px-6 py-4"><div className="text-slate-700">{u.mobile}</div><div className="text-xs text-slate-400">{u.email}</div></td><td className="px-6 py-4"><div className="flex flex-col gap-1"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{u.status}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.paymentStatus === PaymentStatus.PAID ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{u.paymentStatus}</span></div></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="View Details"><Eye className="w-4 h-4"/></button><button onClick={() => { setEditUserForm({...u, customData: u.customData || {}}); setShowEditUserModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit User"><Edit className="w-4 h-4"/></button>{u.paymentStatus === PaymentStatus.PAID && (<button onClick={() => handleRevokePayment(u.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Revoke Payment"><RotateCcw className="w-4 h-4"/></button>)}{currentUser.role === Role.MASTER_ADMIN && (<button onClick={() => handleDeleteUserAccount(u.id, u.fullName)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete User"><Trash2 className="w-4 h-4"/></button>)}</div></td></tr>))}</tbody></table></div>
        </div>
      )}

      {activeTab === 'Payment Mgmt' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                   <h3 className="font-bold text-slate-700">Payment Management</h3>
                   <div className="flex gap-2"><button onClick={handleRemindUnpaid} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 border border-indigo-100 transition-colors"><BellRing className="w-3 h-3" /> Remind All Unpaid</button><button onClick={handleOpenEmailModal} className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-100 border border-sky-100 transition-colors"><Mail className="w-3 h-3" /> Email Unpaid</button><input className="px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search user..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
               </div>
               <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).map(u => (<tr key={u.id} className="border-b hover:bg-slate-50 last:border-0"><td className="px-6 py-4"><p className="font-bold text-slate-900">{u.fullName}</p><p className="text-xs text-slate-500">{u.membershipNo}</p></td><td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.paymentStatus==='PENDING'?'bg-orange-100 text-orange-700':'bg-red-50 text-red-500'}`}>{u.paymentStatus}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setViewingUser(u)} className="mr-2 p-1.5 bg-slate-100 rounded hover:bg-slate-200"><Eye className="w-4 h-4 text-slate-500"/></button><button onClick={() => handleApprovePayment(u.id)} className="px-3 py-1.5 bg-primary text-white text-xs rounded font-bold hover:bg-primary-dark">Mark Paid</button></td></tr>))}{filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).length === 0 && (<tr><td colSpan={3} className="p-8 text-center text-slate-400">All users in current view are paid.</td></tr>)}</tbody></table>
          </div>
      )}

      {activeTab === 'Benefits' && (
          <div className="space-y-4">
              <div className="flex justify-between"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-2 text-slate-400"/><input className="pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Search Benefit..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div><button onClick={() => setIsBenefitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm"><Plus className="w-4 h-4"/> Add Benefit</button></div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody>{filteredBenefits.map(b => (<tr key={b.id} className="border-b hover:bg-slate-50"><td className="px-6 py-4"><div><p className="font-bold">{b.userName}</p><p className="text-xs text-slate-500">{b.regNo}</p></div></td><td className="px-6 py-4">{b.type}</td><td className="px-6 py-4 font-mono font-bold">AED {b.amount}</td><td className="px-6 py-4 text-xs">{b.date}</td><td className="px-6 py-4 text-right"><button onClick={()=>onDeleteBenefit(b.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table></div>
          </div>
      )}

      {activeTab === 'Import Users' && (
          <div className="max-w-4xl mx-auto space-y-8">
              {/* ... (Import Wizard - kept implicitly) */}
              <div className="flex items-center justify-between px-8 relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10" />
                  <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 z-10 ${importStep === 'UPLOAD' ? 'text-primary' : 'text-slate-500'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${importStep === 'UPLOAD' ? 'bg-primary text-white' : 'bg-slate-200'}`}>1</div><span className="text-xs font-bold">Upload CSV</span></div>
                  <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 z-10 ${importStep === 'MAP' ? 'text-primary' : 'text-slate-500'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${importStep === 'MAP' ? 'bg-primary text-white' : 'bg-slate-200'}`}>2</div><span className="text-xs font-bold">Map Columns</span></div>
                  <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 z-10 ${importStep === 'RESULT' ? 'text-primary' : 'text-slate-500'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${importStep === 'RESULT' ? 'bg-primary text-white' : 'bg-slate-200'}`}>3</div><span className="text-xs font-bold">Finish</span></div>
              </div>
              {importStep === 'UPLOAD' && (
                  <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                      <div className="w-20 h-20 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6"><FileSpreadsheet className="w-10 h-10" /></div><h3 className="text-xl font-bold text-slate-900 mb-2">Upload Member List</h3><p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">Select a CSV file containing your member data. The first row should contain header names (e.g., Name, Mobile, Email).</p><label className="inline-block"><input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} /><div className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark cursor-pointer transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"><FileUp className="w-5 h-5" /> Select CSV File</div></label>
                  </div>
              )}
              {importStep === 'MAP' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-lg text-slate-800">Map CSV Columns</h3><button onClick={resetImport} className="text-xs font-bold text-red-500 hover:text-red-700">Cancel</button></div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registration Fields</h4>
                              {questions.map(q => (
                                  <div key={q.id} className="flex flex-col"><label className="text-xs font-bold text-slate-700 mb-1">{q.label} {q.required && <span className="text-red-500">*</span>}</label><select className={`p-2 border rounded text-sm ${q.required && !importConfig.fieldMapping[q.id] ? 'border-red-200 bg-red-50' : 'border-slate-200'}`} value={importConfig.fieldMapping[q.id] || ''} onChange={e => handleMappingChange(q.id, e.target.value)}><option value="">-- Ignore / Not in CSV --</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                              ))}
                              <div className="flex flex-col pt-4 border-t border-slate-100 mt-4"><label className="text-xs font-bold text-slate-700 mb-1">Join Date (Optional)</label><select className="p-2 border border-slate-200 rounded text-sm" value={importConfig.registrationDateColumn} onChange={e => setImportConfig({...importConfig, registrationDateColumn: e.target.value})}><option value="">-- Use Today --</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4"><h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Password Configuration</h4><div className="flex gap-4 mb-2 text-sm"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="pwd" checked={importConfig.passwordSource === 'DEFAULT'} onChange={() => setImportConfig({...importConfig, passwordSource: 'DEFAULT'})} />Default</label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="pwd" checked={importConfig.passwordSource === 'COLUMN'} onChange={() => setImportConfig({...importConfig, passwordSource: 'COLUMN'})} />Use Column</label></div>{importConfig.passwordSource === 'DEFAULT' ? (<input className="w-full p-2 border rounded text-sm" placeholder="Default Password" value={importConfig.defaultPassword} onChange={e => setImportConfig({...importConfig, defaultPassword: e.target.value})} />) : (<select className="w-full p-2 border rounded text-sm" value={importConfig.passwordColumn} onChange={e => setImportConfig({...importConfig, passwordColumn: e.target.value})}><option value="">-- Select Password Column --</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}</select>)}</div>
                          </div>
                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Preview (First 5 Rows)</h4>
                              <div className="overflow-x-auto border border-slate-200 rounded-lg"><table className="w-full text-xs text-left whitespace-nowrap"><thead className="bg-slate-50 font-bold text-slate-600"><tr>{csvHeaders.map(h => <th key={h} className="p-2 border-b border-r last:border-r-0">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{csvPreview.map((row, i) => (<tr key={i}>{row.map((cell, j) => <td key={j} className="p-2 border-r last:border-r-0 max-w-[150px] truncate">{cell}</td>)}</tr>))}</tbody></table></div>
                              <div className="mt-8 flex justify-end"><button onClick={handleStartImport} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">Start Import <ArrowRight className="w-4 h-4" /></button></div>
                          </div>
                      </div>
                  </div>
              )}
              {(importStep === 'PROCESS' || importStep === 'RESULT') && (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-2xl mx-auto">{importStep === 'PROCESS' ? (<div className="py-12"><RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" /><h3 className="text-lg font-bold">Processing...</h3><p className="text-slate-500">Please wait while we validate and import users.</p></div>) : (<div><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${importLog.success > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{importLog.success > 0 ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}</div><h3 className="text-2xl font-bold text-slate-900 mb-2">Import Completed</h3><p className="text-slate-500 mb-6">Successfully imported <strong className="text-green-600">{importLog.success}</strong> users.</p>{importLog.errors.length > 0 && (<div className="text-left bg-red-50 p-4 rounded-xl border border-red-100 mb-6 max-h-60 overflow-y-auto"><h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Errors ({importLog.errors.length})</h4><ul className="text-xs text-red-600 space-y-1 font-mono">{importLog.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>)}<button onClick={resetImport} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">Import More</button></div>)}</div>
              )}
          </div>
      )}

      {activeTab === 'Admin Assign' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6"><div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200"><div className="relative flex-1 mr-4"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Search members to assign role..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div></div><div className="bg-white p-4 rounded-xl border border-slate-200"><div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">{filteredList.slice(0, 100).map(u => (<div key={u.id} className="flex flex-col sm:flex-row justify-between items-center p-3 border rounded-xl hover:bg-slate-50 gap-2 transition-colors"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role !== Role.USER ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{u.fullName.charAt(0)}</div><div><p className="font-bold text-sm text-slate-900">{u.fullName}</p><div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.role === Role.MASTER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>{u.role.replace('_', ' ')}</span><span className="text-[10px] text-slate-400 font-mono">{u.membershipNo}</span></div></div></div><div className="flex gap-2 flex-wrap justify-end items-center">{u.role === Role.USER && (<><button onClick={()=>handleAssignAdmin(u, Role.MASTER_ADMIN)} className="text-[10px] bg-purple-600 text-white px-2 py-1.5 rounded font-bold hover:bg-purple-700">Master Admin</button><button onClick={()=>handleAssignAdmin(u, Role.MANDALAM_ADMIN)} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded font-bold border border-blue-100 hover:bg-blue-100">Mandalam Admin</button><button onClick={()=>handleAssignAdmin(u, Role.CUSTOM_ADMIN)} className="text-[10px] bg-slate-50 text-slate-700 px-2 py-1.5 rounded font-bold border border-slate-100 hover:bg-slate-100">Custom Admin</button></>)}{u.role !== Role.USER && (<button onClick={()=>handleAssignAdmin(u, Role.USER)} className="text-[10px] bg-red-50 text-red-700 px-2 py-1.5 rounded font-bold border border-red-100 hover:bg-red-100">Revoke Access</button>)}</div></div>))}</div></div></div>
      )}

      {/* ... (Reg Questions Tab, New Year Tab - kept implicitly) */}
      {activeTab === 'Reg Questions' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="bg-white p-6 rounded-xl border border-slate-200"><div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-lg text-slate-900">Registration Questions</h3><p className="text-slate-500 text-sm">Manage the questions shown during member sign-up.</p></div><div className="flex gap-3"><button onClick={async () => { if(confirm("Reset to default recommended questions? This will erase custom questions.")) { await StorageService.seedDefaultQuestions(); setQuestions(await StorageService.getQuestions()); } }} className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"><RefreshCw className="w-3 h-3"/> Reset Defaults</button><button onClick={() => { setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1, options: [], systemMapping: 'NONE' }); setIsQuestionModalOpen(true); }} className="flex items-center gap-2 text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-primary-dark transition-colors"><Plus className="w-3 h-3"/> Add Question</button></div></div><div className="space-y-3">{questions.map((q, idx) => (<div key={q.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors bg-white shadow-sm"><div className="flex items-center gap-4"><span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{idx + 1}</span><div><p className="font-bold text-slate-800 text-sm">{q.label} {q.required && <span className="text-red-500">*</span>}</p><div className="flex gap-2 mt-1"><span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{q.type}</span>{q.systemMapping !== 'NONE' && <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded">Mapped: {q.systemMapping}</span>}</div></div></div><div className="flex gap-2"><button onClick={() => { setQuestionForm(q); setIsQuestionModalOpen(true); }} className="p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button><button onClick={async () => { if(confirm("Delete this question permanently?")) { await StorageService.deleteQuestion(q.id); setQuestions(await StorageService.getQuestions()); } }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>
      )}

      {activeTab === 'New Year' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6"><div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm"><div className="text-center max-w-md w-full"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Calendar className="w-10 h-10" /></div><h3 className="text-2xl font-bold text-slate-900 mb-2">Fiscal Year Management</h3><p className="text-slate-500 mb-8 leading-relaxed">Start a new financial year to archive current records and reset all member payment statuses to <span className="font-bold text-red-500">Unpaid</span>.</p><div className="flex flex-col gap-4"><div className="flex gap-2 justify-center items-center"><label className="text-sm font-bold text-slate-600">New Fiscal Year:</label><input type="number" className="border p-2 rounded-lg w-32 text-center font-bold text-lg" value={newYearInput} onChange={(e) => setNewYearInput(e.target.value)} /></div><button onClick={handleStartNewYear} disabled={isProcessingYear} className="w-full px-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed">{isProcessingYear ? (<span className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</span>) : 'Start New Fiscal Year'}</button></div></div></div><div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="p-4 bg-slate-50 border-b font-bold text-slate-700">Year History</div>{years.map(y => (<div key={y.year} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-slate-50"><div className="flex items-center gap-3"><span className="font-bold text-lg text-slate-800">{y.year}</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${y.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{y.status}</span><span className="text-xs text-slate-400 font-mono">({y.count || 0} Members)</span></div>{currentUser.role === Role.MASTER_ADMIN && y.year !== new Date().getFullYear() && (<button onClick={() => handleDeleteYear(y.year)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>)}</div>))}</div></div>
      )}

      {activeTab === 'Card Mgmt' && currentUser.role === Role.MASTER_ADMIN && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-900">ID Card Template</h3><div className="flex gap-2"><button onClick={() => setActiveCardSide('front')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeCardSide === 'front' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Front Side</button><button onClick={() => setActiveCardSide('back')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeCardSide === 'back' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Back Side</button></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 relative bg-slate-100 border border-slate-300 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                        {cardConfig && cardConfig[activeCardSide].templateImage ? (<div className="relative inline-block shadow-xl"><img ref={cardImageRef} src={cardConfig[activeCardSide].templateImage} alt="Card Template" className="max-w-full h-auto block select-none" draggable={false} />{cardConfig[activeCardSide].fields.map(field => (<div key={field.id} onMouseDown={(e) => handleDragStart(e, field.id)} style={{ position: 'absolute', left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)', cursor: 'move', border: '1px dashed rgba(0,0,0,0.5)', padding: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} className="hover:bg-white/80 transition-colors"><p style={{ fontSize: `${field.fontSize}px`, color: field.color, fontWeight: field.fontWeight, whiteSpace: 'nowrap', lineHeight: 1 }}>{field.type === 'QR' ? <QrCode className="w-8 h-8" /> : field.sampleValue}</p></div>))}</div>) : (<div className="text-center"><ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-400 text-sm">No template uploaded for {activeCardSide} side.</p></div>)}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Upload Template Image</label><input type="file" accept="image/*" onChange={handleTemplateUpload} disabled={isUploadingTemplate} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Add Data Field</label><div className="flex gap-2"><select className="flex-1 p-2 rounded border text-sm" value={selectedVariable} onChange={e => setSelectedVariable(e.target.value)}><option value="">Select Field...</option><option value="membershipNo">Registration No</option><option value="registrationDate">Join Date</option><option value="qr_code_verify">Verification QR Code</option>{questions.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}</select><button onClick={addCardVariable} className="bg-primary text-white p-2 rounded hover:bg-primary-dark"><Plus className="w-4 h-4"/></button></div></div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">{cardConfig && cardConfig[activeCardSide].fields.map(field => (<div key={field.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2"><div className="flex justify-between items-center"><span className="font-bold text-slate-700">{field.label}</span><button onClick={() => deleteCardField(field.id)} className="text-red-500"><Trash2 className="w-3 h-3"/></button></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-[10px] text-slate-400">Size (px)</label><input type="number" value={field.fontSize} onChange={(e) => updateCardField(field.id, { fontSize: Number(e.target.value) })} className="w-full border rounded p-1" /></div><div><label className="block text-[10px] text-slate-400">Color</label><input type="color" value={field.color} onChange={(e) => updateCardField(field.id, { color: e.target.value })} className="w-full border rounded p-1 h-6" /></div></div></div>))}</div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {activeTab === 'Sponsors' && currentUser.role === Role.MASTER_ADMIN && (
           <div className="bg-white p-6 rounded-xl border border-slate-200">
               <h3 className="font-bold text-lg text-slate-900 mb-4">Manage Sponsors</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                       <input className="w-full p-2 border rounded text-sm" placeholder="Sponsor Name" value={sponsorForm.name || ''} onChange={e => setSponsorForm({...sponsorForm, name: e.target.value})} />
                       <input className="w-full p-2 border rounded text-sm" placeholder="Website URL (Optional)" value={sponsorForm.website || ''} onChange={e => setSponsorForm({...sponsorForm, website: e.target.value})} />
                       <label className="block p-4 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:bg-slate-50">
                           <input type="file" accept="image/*" className="hidden" onChange={handleSponsorUpload} disabled={isUploadingContent} />
                           <p className="text-sm text-slate-500 font-bold">{isUploadingContent ? 'Uploading...' : 'Click to Upload Logo'}</p>
                       </label>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       {sponsors.map(s => (
                           <div key={s.id} className="p-3 border rounded-xl flex flex-col items-center gap-2 relative group">
                               <img src={s.logoUrl} className="h-12 object-contain" alt={s.name} />
                               <p className="text-xs font-bold">{s.name}</p>
                               <button onClick={async () => { if(confirm("Delete?")) await StorageService.deleteSponsor(s.id); }} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100"><XCircle className="w-4 h-4"/></button>
                           </div>
                       ))}
                       {sponsors.length === 0 && <p className="text-sm text-slate-400 col-span-2 text-center py-4">No sponsors added.</p>}
                   </div>
               </div>
           </div>
      )}

      {activeTab === 'News & Events' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-lg text-slate-900 mb-4">News & Events</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="space-y-4">
                      <div className="flex gap-2">
                          <select className="p-2 border rounded text-sm flex-1" value={newsForm.type} onChange={e => setNewsForm({...newsForm, type: e.target.value as 'NEWS'|'EVENT'})}><option value="NEWS">News</option><option value="EVENT">Event</option></select>
                          <input type="date" className="p-2 border rounded text-sm flex-1" value={newsForm.date} onChange={e => setNewsForm({...newsForm, date: e.target.value})} />
                      </div>
                      <input className="w-full p-2 border rounded text-sm" placeholder="Title" value={newsForm.title || ''} onChange={e => setNewsForm({...newsForm, title: e.target.value})} />
                      <textarea className="w-full p-2 border rounded text-sm h-24" placeholder="Description" value={newsForm.description || ''} onChange={e => setNewsForm({...newsForm, description: e.target.value})} />
                      <input className="w-full p-2 border rounded text-sm" placeholder="Location (Events only)" value={newsForm.location || ''} onChange={e => setNewsForm({...newsForm, location: e.target.value})} />
                      <input className="w-full p-2 border rounded text-sm" placeholder="External Link (Optional)" value={newsForm.link || ''} onChange={e => setNewsForm({...newsForm, link: e.target.value})} />
                      <label className="block p-3 border border-slate-200 rounded text-center cursor-pointer text-xs font-bold text-slate-500 hover:bg-slate-50">
                          {newsForm.imageUrl ? 'Image Selected' : 'Upload Cover Image'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleNewsImageUpload} />
                      </label>
                      <button onClick={handleAddNews} disabled={isUploadingContent} className="w-full py-2 bg-primary text-white rounded font-bold text-sm hover:bg-primary-dark disabled:opacity-50">{isUploadingContent ? 'Publishing...' : 'Publish Content'}</button>
                  </div>
                  <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto">
                      {newsEvents.map(item => (
                          <div key={item.id} className="flex gap-4 p-4 border rounded-xl hover:bg-slate-50 relative group">
                              {item.imageUrl && <img src={item.imageUrl} className="w-20 h-20 object-cover rounded-lg" alt="" />}
                              <div>
                                  <div className="flex gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'EVENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.type}</span><span className="text-xs text-slate-400">{item.date}</span></div>
                                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                                  <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                              </div>
                              <button onClick={async () => { if(confirm("Delete item?")) await StorageService.deleteNewsEvent(item.id); }} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      ))}
                      {newsEvents.length === 0 && <p className="text-center text-slate-400 py-10">No items.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* ... (Modals - kept implicitly) */}
      {viewProofUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewProofUrl(null)}>
              <img src={viewProofUrl} alt="Proof" className="max-w-full max-h-[90vh] rounded-lg" />
              <button className="absolute top-4 right-4 text-white p-2"><X className="w-8 h-8"/></button>
          </div>
      )}

      {isBenefitModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Benefit Record</h3>
            <div className="space-y-3">
              <select className="w-full p-2 border rounded" value={benefitForm.userId} onChange={e=>setBenefitForm({...benefitForm, userId: e.target.value})}>
                <option value="">Select User...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.membershipNo})</option>)}
              </select>
              <select className="w-full p-2 border rounded" value={benefitForm.type} onChange={e=>setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}>
                {Object.values(BenefitType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" placeholder="Amount (AED)" className="w-full p-2 border rounded" value={benefitForm.amount} onChange={e=>setBenefitForm({...benefitForm, amount: e.target.value})} />
              <textarea placeholder="Remarks" className="w-full p-2 border rounded" value={benefitForm.remarks} onChange={e=>setBenefitForm({...benefitForm, remarks: e.target.value})} />
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={()=>setIsBenefitModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                <button onClick={handleAddBenefitSubmit} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                 <h3 className="text-lg font-bold mb-4">Edit User Profile</h3>
                 <div className="space-y-4">
                     {questions.map(q => {
                         const isCustom = !q.systemMapping || q.systemMapping === 'NONE';
                         const val = isCustom 
                            ? (editUserForm.customData as any)?.[q.id] || ''
                            : (editUserForm as any)[q.systemMapping || ''] || '';
                         const onChange = (e: any) => handleEditUserFieldChange(isCustom ? q.id : q.systemMapping!, e.target.value, isCustom);
                         if (q.type === FieldType.DROPDOWN || q.type === FieldType.DEPENDENT_DROPDOWN) {
                             return (
                                 <div key={q.id}>
                                     <label className="block text-xs font-bold text-slate-500 mb-1">{q.label}</label>
                                     <select className="w-full p-2 border rounded text-sm" value={val} onChange={onChange}>
                                         <option value="">Select...</option>
                                         {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                         {q.type === FieldType.DEPENDENT_DROPDOWN && q.dependentOptions && Object.values(q.dependentOptions).flat().map(o => <option key={o} value={o}>{o}</option>)}
                                     </select>
                                 </div>
                             );
                         }
                         return (
                             <div key={q.id}>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">{q.label}</label>
                                 <input className="w-full p-2 border rounded text-sm" value={val} onChange={onChange} placeholder={`Enter ${q.label}`} />
                             </div>
                         );
                     })}
                     <div className="flex gap-3 justify-end mt-4">
                         <button onClick={() => setShowEditUserModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                         <button onClick={saveEditUser} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Save Changes</button>
                     </div>
                 </div>
            </div>
        </div>
      )}

      {/* Question Add/Edit Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 text-slate-900">{questionForm.id ? 'Edit Question' : 'Add New Question'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Question Label</label>
                        <input 
                            className="w-full p-2 border rounded text-sm" 
                            placeholder="e.g. Blood Group"
                            value={questionForm.label || ''}
                            onChange={e => setQuestionForm({...questionForm, label: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Input Type</label>
                            <select 
                                className="w-full p-2 border rounded text-sm bg-white"
                                value={questionForm.type}
                                onChange={e => setQuestionForm({...questionForm, type: e.target.value as FieldType})}
                            >
                                {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">System Mapping</label>
                            <select 
                                className="w-full p-2 border rounded text-sm bg-white"
                                value={questionForm.systemMapping || 'NONE'}
                                onChange={e => setQuestionForm({...questionForm, systemMapping: e.target.value as any})}
                            >
                                <option value="NONE">None (Custom Field)</option>
                                <option value="fullName">Full Name</option>
                                <option value="mobile">Mobile</option>
                                <option value="email">Email</option>
                                <option value="emiratesId">Emirates ID</option>
                                <option value="addressUAE">Address UAE</option>
                                <option value="addressIndia">Address India</option>
                                <option value="nominee">Nominee</option>
                                <option value="relation">Relation</option>
                                <option value="isKMCCMember">KMCC Member</option>
                                <option value="kmccNo">KMCC No</option>
                            </select>
                        </div>
                    </div>

                    {(questionForm.type === FieldType.DROPDOWN || questionForm.type === FieldType.DEPENDENT_DROPDOWN) && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Options (Comma separated)</label>
                            <textarea 
                                className="w-full p-2 border rounded text-sm h-20"
                                placeholder="Option 1, Option 2, Option 3"
                                value={Array.isArray(questionForm.options) ? questionForm.options.join(', ') : questionForm.options}
                                onChange={e => setQuestionForm({...questionForm, options: e.target.value.split(',').map(s=>s.trim())})}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Placeholder</label>
                            <input 
                                className="w-full p-2 border rounded text-sm" 
                                value={questionForm.placeholder || ''}
                                onChange={e => setQuestionForm({...questionForm, placeholder: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Display Order</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded text-sm" 
                                value={questionForm.order || 0}
                                onChange={e => setQuestionForm({...questionForm, order: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={questionForm.required || false}
                            onChange={e => setQuestionForm({...questionForm, required: e.target.checked})}
                        />
                        <span className="text-sm font-medium text-slate-700">Required Field</span>
                    </label>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setIsQuestionModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded text-sm font-bold">Cancel</button>
                    <button onClick={handleSaveQuestion} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-bold shadow-lg shadow-slate-900/20">Save Question</button>
                </div>
            </div>
        </div>
      )}

      {viewingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewingUser(null)}>
             <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                     <h3 className="text-xl font-bold text-slate-800">Member Details</h3>
                     <button onClick={() => setViewingUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                 </div>
                 <div className="p-6 space-y-6">
                     <div className="flex items-center gap-4">
                         {viewingUser.photoUrl ? (
                             <img src={viewingUser.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                         ) : (
                             <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400"><UserIcon className="w-10 h-10"/></div>
                         )}
                         <div>
                             <h2 className="text-xl font-bold text-slate-900">{viewingUser.fullName}</h2>
                             <p className="text-slate-500">{viewingUser.membershipNo}</p>
                             <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${viewingUser.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewingUser.paymentStatus}</span>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                         <div><p className="text-xs text-slate-400 font-bold uppercase">Reg No</p><p>{viewingUser.membershipNo}</p></div>
                         <div><p className="text-xs text-slate-400 font-bold uppercase">Status</p><p>{viewingUser.status}</p></div>
                         {questions.map(q => {
                             let value = '';
                             if (q.systemMapping && q.systemMapping !== 'NONE') {
                                 const val = (viewingUser as any)[q.systemMapping];
                                 if (typeof val === 'boolean') value = val ? 'Yes' : 'No';
                                 else value = val || '';
                             } else { value = viewingUser.customData?.[q.id] || ''; }
                             if (!value && q.type !== FieldType.PASSWORD) return null; 
                             return (
                                 <div key={q.id} className={q.type === FieldType.TEXTAREA ? "col-span-2" : ""}>
                                     <p className="text-xs text-slate-400 font-bold uppercase">{q.label}</p>
                                     <p className="break-words font-medium">{String(value)}</p>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
                 <div className="p-4 bg-slate-50 border-t rounded-b-2xl flex justify-end">
                     <button onClick={() => setViewingUser(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold text-sm">Close</button>
                 </div>
             </div>
        </div>
      )}

      {showMandalamModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                   <h3 className="font-bold mb-4">Assign Mandalam Admin</h3>
                   <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                       {MANDALAMS.map(m => (
                           <label key={m} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                               <input 
                                  type="checkbox" 
                                  checked={assignMandalamSel.includes(m as Mandalam)}
                                  onChange={(e) => {
                                      if(e.target.checked) setAssignMandalamSel([...assignMandalamSel, m as Mandalam]);
                                      else setAssignMandalamSel(assignMandalamSel.filter(x => x !== m));
                                  }}
                               />
                               <span className="text-sm">{m}</span>
                           </label>
                       ))}
                   </div>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setShowMandalamModal(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                       <button onClick={saveAdminAssignment} className="px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark">Save</button>
                   </div>
               </div>
          </div>
      )}

      {showCustomModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                   <h3 className="font-bold mb-4">Assign Custom Permissions</h3>
                   <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                       <p className="text-xs font-bold text-slate-500 mb-2">Select Mandalams</p>
                       {MANDALAMS.map(m => (
                           <label key={m} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                               <input 
                                  type="checkbox" 
                                  checked={customMandalams.includes(m as Mandalam)}
                                  onChange={(e) => {
                                      if(e.target.checked) setCustomMandalams([...customMandalams, m as Mandalam]);
                                      else setCustomMandalams(customMandalams.filter(x => x !== m));
                                  }}
                               />
                               <span className="text-sm">{m}</span>
                           </label>
                       ))}
                   </div>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setShowCustomModal(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                       <button onClick={saveAdminAssignment} className="px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark">Save</button>
                   </div>
               </div>
          </div>
      )}

      {showEmailReminderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                   <h3 className="font-bold mb-4">Confirm Email Blast</h3>
                   <p className="text-sm text-slate-600 mb-4">
                       Send payment reminder email to <b>{getUnpaidEmails().length}</b> unpaid members?
                   </p>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setShowEmailReminderModal(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                       <button onClick={() => {
                           const emails = getUnpaidEmails();
                           if(emails.length > 0) {
                               StorageService.sendEmail(emails, "Membership Payment Reminder", "Please update your payment status.");
                               alert(`Emails queued for ${emails.length} members.`);
                           }
                           setShowEmailReminderModal(false);
                       }} className="px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark">Send Emails</button>
                   </div>
               </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;

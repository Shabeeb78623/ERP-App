
import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification, CardConfig, CardField } from '../types';
import { Search, Trash2, Eye, Plus, Calendar, Edit, X, Check, ArrowUp, ArrowDown, Wallet, LayoutTemplate, ImagePlus, RefreshCw, AlertCircle, FileUp, Move, Save, BarChart3, PieChart, ShieldAlert, Lock, Download, UserPlus, XCircle, CheckCircle2, QrCode, ShieldCheck, UserCheck, Building2, BellRing, Mail, Copy, Send, Settings, CheckCircle } from 'lucide-react';
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
// Paste your keys from emailjs.com here to hardcode them.
// If you leave these empty, you can still enter them via the "Configure Keys" button in the UI.
const EMAILJS_SERVICE_ID = '';   // e.g., 'service_xyz'
const EMAILJS_TEMPLATE_ID = '';  // e.g., 'template_abc'
const EMAILJS_PUBLIC_KEY = '';   // e.g., 'user_123456'

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  benefits: BenefitRecord[];
  notifications: Notification[];
  years: YearConfig[]; 
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  isLoading: boolean;
}

const ALL_TABS = [
  'User Approvals', 'Users Overview', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Import Users', 'Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt'
];

const ADMIN_PERMISSIONS = [
  { id: 'view_users', label: 'Can View Users' },
  { id: 'edit_users', label: 'Can Edit Users' },
  { id: 'approve_users', label: 'Can Approve Users' },
  { id: 'manage_payments', label: 'Can Manage Payments' },
  { id: 'manage_benefits', label: 'Can Manage Benefits' },
  { id: 'send_notifications', label: 'Can Send Notifications' },
];

const SYSTEM_FIELD_MAPPING = [
    { value: 'NONE', label: 'None (Custom Data)' },
    { value: 'fullName', label: 'Full Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'password', label: 'Password' },
    { value: 'mobile', label: 'Mobile Number' },
    { value: 'emiratesId', label: 'Emirates ID' },
    { value: 'mandalam', label: 'Mandalam' },
    { value: 'emirate', label: 'Emirate' },
    { value: 'addressUAE', label: 'Address (UAE)' },
    { value: 'addressIndia', label: 'Address (India)' },
    { value: 'nominee', label: 'Nominee' },
    { value: 'relation', label: 'Relation to Nominee' },
    { value: 'recommendedBy', label: 'Recommended By' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, years, stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, isLoading }) => {
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
  
  // Email Modal State
  const [showEmailReminderModal, setShowEmailReminderModal] = useState(false);
  const [emailReminderSubject, setEmailReminderSubject] = useState('Action Required: Membership Fee Payment');
  const [emailReminderBody, setEmailReminderBody] = useState(`Dear Member,

This is a gentle reminder regarding your membership fee for the current fiscal year. 

Please ensure your payment is completed to maintain your active status and access member benefits.

You can view your status and ID card by logging into the member portal.

Regards,
Admin Team`);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  
  // EmailJS Config State
  const [emailConfig, setEmailConfig] = useState({
      serviceId: EMAILJS_SERVICE_ID || localStorage.getItem('emailjs_service_id') || '',
      templateId: EMAILJS_TEMPLATE_ID || localStorage.getItem('emailjs_template_id') || '',
      publicKey: EMAILJS_PUBLIC_KEY || localStorage.getItem('emailjs_public_key') || ''
  });
  const [showEmailConfig, setShowEmailConfig] = useState(false);

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
  const [newOption, setNewOption] = useState('');
  
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
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>(''); 
  const cardImageRef = useRef<HTMLImageElement>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  
  const cardConfigRef = useRef<CardConfig | null>(null);
  useEffect(() => { cardConfigRef.current = cardConfig; }, [cardConfig]);

  // Filter Tabs based on Role
  const visibleTabs = ALL_TABS.filter(tab => {
      if (['Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt', 'Import Users'].includes(tab)) {
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

  // Drag and drop logic...
  useEffect(() => {
    if (!draggedFieldId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
        const config = cardConfigRef.current;
        if (!config || !cardImageRef.current) return;
        const rect = cardImageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let xPct = (x / rect.width) * 100;
        let yPct = (y / rect.height) * 100;
        xPct = Math.max(0, Math.min(100, xPct));
        yPct = Math.max(0, Math.min(100, yPct));

        const updatedSide = {
            ...config[activeCardSide],
            fields: config[activeCardSide].fields.map(f => f.id === draggedFieldId ? { ...f, x: xPct, y: yPct } : f)
        };
        setCardConfig({ ...config, [activeCardSide]: updatedSide });
    };

    const handleWindowMouseUp = async () => {
        setDraggedFieldId(null);
        if (cardConfigRef.current) {
            await StorageService.saveCardConfig(cardConfigRef.current);
        }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggedFieldId, activeCardSide]);

  const getAuthorizedUsers = () => {
    const realUsers = users.filter(u => u.id !== 'admin-master');
    const isAssignTab = activeTab === 'Admin Assign';
    // For Users Overview, show everyone. For Approvals, just users.
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
    if (currentUser.role === Role.CUSTOM_ADMIN) {
        if (currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0) {
             return effectiveUsers.filter(u => currentUser.assignedMandalams!.includes(u.mandalam));
        }
        return effectiveUsers;
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

  const handleApproveUser = async (id: string) => {
      if(confirm("Are you sure you want to APPROVE this user?")) {
          await StorageService.updateUser(id, { 
              status: UserStatus.APPROVED, 
              approvedBy: currentUser.fullName, 
              approvedAt: new Date().toLocaleDateString() 
          });
      }
  };

  const handleRejectUser = async (id: string) => {
      if(confirm("Are you sure you want to REJECT this user?")) {
          await StorageService.updateUser(id, { status: UserStatus.REJECTED });
      }
  };

  const handleApprovePayment = async (id: string) => {
      if(confirm("Confirm payment received and approve user?")) {
          await StorageService.updateUser(id, { 
              paymentStatus: PaymentStatus.PAID, 
              status: UserStatus.APPROVED, 
              approvedBy: currentUser.fullName, 
              approvedAt: new Date().toLocaleDateString() 
          });
      }
  };

  const handleRejectPayment = async (id: string) => {
      if(confirm("Reject this payment submission? User will be notified.")) {
          await StorageService.updateUser(id, { paymentStatus: PaymentStatus.UNPAID });
      }
  };

  const handleRemindUnpaid = async () => {
    const unpaidUsers = authorizedUsers.filter(u => u.paymentStatus !== PaymentStatus.PAID && u.role === Role.USER);
    if (unpaidUsers.length === 0) {
        alert("No unpaid members found in your list.");
        return;
    }
    
    if (confirm(`Send in-app notification to ${unpaidUsers.length} unpaid members?`)) {
        const currentYear = years.length > 0 ? years[0].year : new Date().getFullYear();
        try {
            await StorageService.addNotification({
                id: `notif-remind-${Date.now()}`,
                title: "Membership Payment Reminder",
                message: `Please complete your membership payment or renewal for the fiscal year ${currentYear} to access your ID card and benefits.`,
                date: new Date().toLocaleDateString(),
                read: false,
                type: 'INDIVIDUAL',
                targetAudience: 'Unpaid Members',
                recipients: unpaidUsers.map(u => u.id)
            });
            alert("Reminders sent successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to send reminders.");
        }
    }
  };

  const getUnpaidEmails = () => {
      return authorizedUsers
          .filter(u => u.role === Role.USER && u.paymentStatus !== PaymentStatus.PAID && u.email && u.email.includes('@'))
          .map(u => u.email as string);
  };

  const handleOpenEmailModal = () => {
      const emails = getUnpaidEmails();
      if (emails.length === 0) {
          alert("No unpaid members with valid email addresses found.");
          return;
      }
      setShowEmailReminderModal(true);
  };

  const handleSaveEmailConfig = () => {
      localStorage.setItem('emailjs_service_id', emailConfig.serviceId);
      localStorage.setItem('emailjs_template_id', emailConfig.templateId);
      localStorage.setItem('emailjs_public_key', emailConfig.publicKey);
      alert("Email configuration saved locally!");
      setShowEmailConfig(false);
  };

  const handleSendEmails = async () => {
      const unpaidUsersWithEmail = authorizedUsers
          .filter(u => u.role === Role.USER && u.paymentStatus !== PaymentStatus.PAID && u.email && u.email.includes('@'));

      if (unpaidUsersWithEmail.length === 0) return;
      
      const { serviceId, templateId, publicKey } = emailConfig;
      if (!serviceId || !templateId || !publicKey) {
          alert("Please configure EmailJS settings first (click the gear icon) or hardcode them in the source code.");
          setShowEmailConfig(true);
          return;
      }

      if(!confirm(`This will send ${unpaidUsersWithEmail.length} emails using your EmailJS free tier quota. Continue?`)) return;

      setIsSendingEmail(true);
      setSendingProgress(0);

      try {
          emailjs.init(publicKey);
          
          let successCount = 0;
          let failCount = 0;

          // Sequential sending to avoid rate limiting on free tier
          for (let i = 0; i < unpaidUsersWithEmail.length; i++) {
              const user = unpaidUsersWithEmail[i];
              const email = user.email || '';
              const name = user.fullName || 'Member';

              try {
                  await emailjs.send(serviceId, templateId, {
                      to_email: email, // IMPORTANT: Ensure your EmailJS template uses {{to_email}} in the "To" field
                      to_name: name,   // IMPORTANT: Ensure your EmailJS template uses {{to_name}} if you want to greet them
                      subject: emailReminderSubject,
                      message: emailReminderBody,
                  });
                  successCount++;
              } catch (err) {
                  console.error(`Failed to send to ${email}`, err);
                  failCount++;
              }
              // Update progress
              setSendingProgress(Math.round(((i + 1) / unpaidUsersWithEmail.length) * 100));
              
              // Small delay to be polite to the API
              await new Promise(r => setTimeout(r, 600));
          }

          alert(`Process Complete.\nSent: ${successCount}\nFailed: ${failCount}`);
          setShowEmailReminderModal(false);
      } catch (e) {
          alert("Critical error during sending.");
          console.error(e);
      } finally {
          setIsSendingEmail(false);
          setSendingProgress(0);
      }
  };

  const handleCopyEmails = () => {
      const emails = getUnpaidEmails();
      navigator.clipboard.writeText(emails.join(', '));
      alert(`${emails.length} email addresses copied to clipboard!`);
  };

  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      onAddBenefit({
          id: `benefit-${Date.now()}`,
          userId: benefitForm.userId,
          userName: user?.fullName,
          regNo: user?.membershipNo,
          type: benefitForm.type,
          amount: Number(benefitForm.amount),
          remarks: benefitForm.remarks,
          date: new Date().toLocaleDateString()
      });
      setIsBenefitModalOpen(false);
      setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
  };

  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) return alert("Enter title and message");
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          let audienceLabel = 'All Members';
          if (notifTarget !== 'ALL') {
              recipients = users.filter(u => u.mandalam === notifTarget).map(u => u.id);
              audienceLabel = `${notifTarget} Members`;
          } else if (currentUser.role === Role.MANDALAM_ADMIN) {
              recipients = authorizedUsers.map(u => u.id);
              audienceLabel = 'My Members';
          }
          await StorageService.addNotification({
              id: `notif-${Date.now()}`,
              title: notifTitle,
              message: notifMessage,
              date: new Date().toLocaleDateString(),
              read: false,
              type: recipients ? 'INDIVIDUAL' : 'BROADCAST',
              targetAudience: audienceLabel,
              recipients: recipients 
          });
          alert("Notification Sent!");
          setNotifTitle(''); setNotifMessage('');
      } catch (e) {
          alert("Error sending notification");
          console.error(e);
      } finally { 
          setSendingNotif(false); 
      }
  };

  // ... (Other handlers like assign admin, import users, card vars, etc. remain the same) ...

  const handleAssignAdmin = async (user: User, role: Role) => {
      if (role === Role.MANDALAM_ADMIN) { 
          setSelectedUserForAdmin(user); 
          setAssignMandalamSel(user.assignedMandalams || [user.mandalam]); 
          setShowMandalamModal(true); 
      } else if (role === Role.CUSTOM_ADMIN) { 
          setSelectedUserForAdmin(user); 
          setCustomPerms(user.permissions || []); 
          setCustomMandalams(user.assignedMandalams || []); 
          setShowCustomModal(true); 
      } else {
          const isRevoke = role === Role.USER;
          const actionName = isRevoke ? "Revoke Admin Rights" : "Grant All Access Admin";
          if(confirm(`${actionName} for ${user.fullName}?`)) {
              await StorageService.updateUser(user.id, { 
                  role: role, 
                  assignedMandalams: [], 
                  permissions: [] 
              });
              alert("User role updated successfully.");
          }
      }
  };

  const handleDeleteUserAccount = async (userId: string, name: string) => {
      if (confirm(`Are you sure you want to PERMANENTLY DELETE the account for ${name}? This action cannot be undone.`)) {
          try {
              await StorageService.deleteUser(userId);
              alert("Account deleted successfully.");
          } catch (e) {
              alert("Failed to delete account. Please try again.");
          }
      }
  };

  const saveAdminAssignment = async () => {
      if (!selectedUserForAdmin) return;
      try {
        if (showMandalamModal) {
             await StorageService.updateUser(selectedUserForAdmin.id, { 
                 role: Role.MANDALAM_ADMIN, 
                 assignedMandalams: assignMandalamSel 
             });
        } else if (showCustomModal) {
             await StorageService.updateUser(selectedUserForAdmin.id, { 
                 role: Role.CUSTOM_ADMIN, 
                 permissions: customPerms, 
                 assignedMandalams: customMandalams 
             });
        }
        alert("Admin permissions updated successfully.");
      } catch (e) {
        alert("Failed to update permissions.");
      }
      setShowMandalamModal(false); 
      setShowCustomModal(false); 
      setSelectedUserForAdmin(null);
  };

  const handleImportUsers = async () => {
      if (!importFile) return;
      setIsImporting(true); setImportProgress(0);
      try {
          const text = await importFile.text();
          const lines = text.split('\n').filter(l => l.trim());
          const newUsers: User[] = [];
          const currentYear = new Date().getFullYear();
          let currentSeq = await StorageService.getNextSequence(currentYear);
          const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
               const cols = lines[i].split(',');
               if (cols.length >= 2) {
                   const generatedRegNo = `${currentYear}${currentSeq.toString().padStart(4, '0')}`;
                   newUsers.push({
                       id: `user-${Date.now()}-${i}`,
                       fullName: cols[0]?.trim() || 'Unknown',
                       emiratesId: cols[1]?.trim() || `784${Date.now()}${i}`,
                       mobile: cols[2]?.trim() || '',
                       whatsapp: cols[2]?.trim() || '',
                       emirate: (cols[3]?.trim() as Emirate) || Emirate.DUBAI,
                       mandalam: (cols[4]?.trim() as Mandalam) || Mandalam.VATAKARA,
                       registrationDate: cols[5]?.trim() || new Date().toLocaleDateString(), 
                       status: UserStatus.APPROVED,
                       paymentStatus: PaymentStatus.UNPAID,
                       role: Role.USER,
                       registrationYear: currentYear,
                       membershipNo: generatedRegNo,
                       password: cols[1]?.trim() || 'password', 
                       photoUrl: '',
                       isImported: true,
                       approvedBy: currentUser.fullName,
                       approvedAt: new Date().toLocaleDateString()
                   });
                   currentSeq++;
               }
          }
          await StorageService.addUsers(newUsers, setImportProgress);
          alert(`Successfully imported ${newUsers.length} users.`);
      } catch(e) { 
          alert("Error importing users. Please check CSV format."); 
          console.error(e);
      } finally { 
          setIsImporting(false); 
          setImportFile(null); 
      }
  };
  
  const handleAddNewUser = async () => {
      if(!newUserForm.fullName || !newUserForm.mobile) return alert("Name and Mobile are required");
      try {
          const currentYear = new Date().getFullYear();
          const nextSeq = await StorageService.getNextSequence(currentYear);
          const membershipNo = `${currentYear}${nextSeq.toString().padStart(4, '0')}`;
          const newUser: User = {
              ...newUserForm as User,
              id: `user-${Date.now()}`,
              membershipNo,
              registrationYear: currentYear,
              registrationDate: new Date().toLocaleDateString(),
              password: newUserForm.emiratesId || 'password',
              photoUrl: '',
              isImported: true,
              approvedBy: currentUser.fullName,
              approvedAt: new Date().toLocaleDateString(),
              whatsapp: newUserForm.mobile || '',
              emiratesId: newUserForm.emiratesId || `784${Date.now()}`
          };
          await StorageService.addUser(newUser);
          setShowAddUserModal(false);
          setNewUserForm({ role: Role.USER, status: UserStatus.APPROVED, paymentStatus: PaymentStatus.UNPAID, mandalam: Mandalam.VATAKARA, emirate: Emirate.DUBAI });
          alert("User added successfully.");
      } catch(e: any) {
          alert(e.message);
      }
  };

  const handleStartNewYear = async () => {
      const year = parseInt(newYearInput, 10);
      if(isNaN(year) || year < 2024 || year > 2050) {
          alert("Please enter a valid year (2024-2050)");
          return;
      }
      if(!confirm(`ACTION: START FISCAL YEAR ${year}\n\n1. Current active year will be archived.\n2. ALL members will be reset to 'UNPAID'.\n3. Renewal fees will apply for existing members.\n\nAre you sure you want to proceed?`)) return;
      setIsProcessingYear(true);
      try {
          await StorageService.createNewYear(year);
          await StorageService.resetAllUserPayments(year);
          alert(`Success! Fiscal Year ${year} started. Payment status for all members has been reset to UNPAID.`);
          setNewYearInput(String(year + 1));
      } catch (e: any) {
          console.error("New Year Error:", e);
          alert("Operation Failed: " + e.message);
      } finally {
          setIsProcessingYear(false);
      }
  };

  const handleDeleteYear = async (year: number) => {
      if (!confirm(`Are you sure you want to delete the fiscal year ${year}? This will remove it from the history.`)) return;
      try {
          await StorageService.deleteYear(year);
      } catch (e) {
          console.error(e);
          alert("Failed to delete year.");
      }
  };

  const saveEditUser = async () => {
      if (!editUserForm.id) return;
      await onUpdateUser(editUserForm.id, editUserForm);
      setShowEditUserModal(false);
      setEditUserForm({});
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploadingTemplate(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const img = new Image();
              img.onload = async () => {
                  let updatedConfig = cardConfig;
                  if (!updatedConfig) {
                      updatedConfig = {
                          front: { templateImage: '', fields: [], width: 800, height: 500 },
                          back: { templateImage: '', fields: [], width: 800, height: 500 }
                      };
                  }
                  const newSideConfig = {
                      templateImage: base64,
                      fields: updatedConfig[activeCardSide].fields || [],
                      width: img.width,
                      height: img.height
                  };
                  updatedConfig = { ...updatedConfig, [activeCardSide]: newSideConfig };
                  await StorageService.saveCardConfig(updatedConfig);
                  setCardConfig(updatedConfig);
                  setIsUploadingTemplate(false);
              };
              img.src = base64;
          };
          reader.readAsDataURL(file);
      }
  };

  const addCardVariable = async () => {
      if (!cardConfig || !selectedVariable) return;
      let label = "Unknown";
      let key = selectedVariable;
      let sample = "Sample Text";
      let type: 'TEXT' | 'QR' = 'TEXT';
      if (key === 'membershipNo') {
          label = 'Registration No';
          sample = '20250001';
      } else if (key === 'registrationDate') {
          label = 'Joined Date';
          sample = '01/01/2025';
      } else if (key === 'qr_code_verify') {
          label = 'Verification QR Code';
          sample = 'QR';
          type = 'QR';
      } else {
          const q = questions.find(q => q.id === key);
          if (q) {
              label = q.label;
              key = (q.systemMapping && q.systemMapping !== 'NONE') ? q.systemMapping : q.id;
              sample = q.label;
          }
      }
      const newField: CardField = {
          id: `field-${Date.now()}`,
          label,
          key,
          x: 50,
          y: 50,
          fontSize: 14,
          color: '#000000',
          fontWeight: 'bold',
          sampleValue: sample,
          type
      };
      const updatedSide = {
          ...cardConfig[activeCardSide],
          fields: [...cardConfig[activeCardSide].fields, newField]
      };
      const updatedConfig = { ...cardConfig, [activeCardSide]: updatedSide };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
      setSelectedVariable('');
  };

  const updateCardField = async (id: string, updates: Partial<CardField>) => {
      if (!cardConfig) return;
      const updatedSide = { 
          ...cardConfig[activeCardSide], 
          fields: cardConfig[activeCardSide].fields.map(f => f.id === id ? { ...f, ...updates } : f) 
      };
      const updatedConfig = { ...cardConfig, [activeCardSide]: updatedSide };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
  };

  const deleteCardField = async (id: string) => {
      if (!cardConfig) return;
      const updatedSide = { ...cardConfig[activeCardSide], fields: cardConfig[activeCardSide].fields.filter(f => f.id !== id) };
      const updatedConfig = { ...cardConfig, [activeCardSide]: updatedSide };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); e.preventDefault();
      setDraggedFieldId(id);
  };

  const StatCard = ({ label, value, colorClass }: { label: string, value: string | number, colorClass: string }) => (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-500 uppercase font-medium mt-1">{label}</p>
      </div>
  );

  const pendingPayments = filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING);
  const paymentHistory = filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID || (u.paymentStatus === PaymentStatus.UNPAID && u.paymentRemarks));

  const handleDownloadCSV = () => {
        const headers = ["Reg No", "Full Name", "Email", "Mobile", "WhatsApp", "Emirates ID", "Mandalam", "Emirate", "Status", "Payment Status", "Year"];
        const csvContent = [
            headers.join(","),
            ...authorizedUsers.map(user => [
                user.membershipNo,
                `"${user.fullName}"`,
                user.email || "",
                `"${user.mobile}"`,
                `"${user.whatsapp}"`,
                `"${user.emiratesId}"`,
                user.mandalam,
                user.emirate,
                user.status,
                user.paymentStatus,
                user.registrationYear
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Members_Export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">Year:</span>
               <select className="bg-white border border-slate-200 text-sm font-bold rounded px-2 py-1 outline-none">
                   {years.length > 0 ? (
                       years.map(y => <option key={y.year} value={y.year}>{y.year}</option>)
                   ) : (
                       <option>{new Date().getFullYear()}</option>
                   )}
               </select>
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
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 md:col-span-2">
                <p className="text-2xl font-bold text-emerald-600">AED {stats.collected}</p>
                <p className="text-xs text-slate-500 uppercase font-medium mt-1">Collected</p>
            </div>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 mt-2 no-scrollbar">
        {visibleTabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Users Overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header with Search and Export */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                <h3 className="font-bold text-slate-800">All Members Directory</h3>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary w-full" placeholder="Search members..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                    </div>
                </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Reg No</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredList.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-slate-600">{u.membershipNo}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{u.fullName}</div>
                                    <div className="text-xs text-slate-500">{u.mandalam}, {u.emirate}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-700">{u.mobile}</div>
                                    <div className="text-xs text-slate-400">{u.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {u.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${u.paymentStatus === PaymentStatus.PAID ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.paymentStatus}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="View Details"><Eye className="w-4 h-4"/></button>
                                        <button onClick={() => { setEditUserForm(u); setShowEditUserModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit User"><Edit className="w-4 h-4"/></button>
                                        {currentUser.role === Role.MASTER_ADMIN && (
                                            <button onClick={() => handleDeleteUserAccount(u.id, u.fullName)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete User"><Trash2 className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'User Approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Pending Approvals</h3>
                 <div className="relative">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                     <input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                 </div>
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Details</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                 <tbody>
                     {filteredList.filter(u => u.status === UserStatus.PENDING).map(u => (
                         <tr key={u.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4"><div><p className="font-bold">{u.fullName}</p><p className="text-xs text-slate-500">{u.mobile}</p></div></td>
                             <td className="px-6 py-4 text-xs">
                                 <p>{u.mandalam}, {u.emirate}</p>
                                 <p className="text-slate-400">Reg: {u.registrationDate}</p>
                             </td>
                             <td className="px-6 py-4 text-right space-x-2">
                                 <button onClick={() => setViewingUser(u)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4" /></button>
                                 <button onClick={() => handleApproveUser(u.id)} className="px-3 py-1 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700">Approve</button>
                                 <button onClick={() => handleRejectUser(u.id)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded font-bold text-xs hover:bg-red-50">Reject</button>
                             </td>
                         </tr>
                     ))}
                     {filteredList.filter(u => u.status === UserStatus.PENDING).length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending approvals</td></tr>}
                 </tbody>
             </table>
        </div>
      )}

      {activeTab === 'Payment Mgmt' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                   <h3 className="font-bold text-slate-700">Payment Management</h3>
                   <div className="flex gap-2">
                       <button 
                         onClick={handleRemindUnpaid}
                         className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 border border-indigo-100 transition-colors"
                       >
                           <BellRing className="w-3 h-3" /> Remind All Unpaid
                       </button>
                       <button 
                            onClick={handleOpenEmailModal}
                            className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-100 border border-sky-100 transition-colors"
                        >
                            <Mail className="w-3 h-3" /> Email Unpaid
                        </button>
                       <input className="px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search user..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                   </div>
               </div>
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                       <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr>
                   </thead>
                   <tbody>
                       {filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).map(u => (
                           <tr key={u.id} className="border-b hover:bg-slate-50 last:border-0">
                               <td className="px-6 py-4">
                                   <p className="font-bold text-slate-900">{u.fullName}</p>
                                   <p className="text-xs text-slate-500">{u.membershipNo}</p>
                               </td>
                               <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold ${u.paymentStatus==='PENDING'?'bg-orange-100 text-orange-700':'bg-red-50 text-red-500'}`}>{u.paymentStatus}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                   <button onClick={() => setViewingUser(u)} className="mr-2 p-1.5 bg-slate-100 rounded hover:bg-slate-200"><Eye className="w-4 h-4 text-slate-500"/></button>
                                   <button onClick={() => handleApprovePayment(u.id)} className="px-3 py-1.5 bg-primary text-white text-xs rounded font-bold hover:bg-primary-dark">Mark Paid</button>
                               </td>
                           </tr>
                       ))}
                       {filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).length === 0 && (
                           <tr><td colSpan={3} className="p-8 text-center text-slate-400">All users in current view are paid.</td></tr>
                       )}
                   </tbody>
               </table>
          </div>
      )}

      {/* 5. PAYMENT SUBS (SUBMISSIONS) */}
      {activeTab === 'Payment Subs' && (
          <div className="space-y-6">
               {/* PENDING APPROVALS */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                       <h3 className="font-bold text-orange-800 flex items-center gap-2">
                           <AlertCircle className="w-4 h-4" /> Pending Payment Approvals
                       </h3>
                       <span className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-full">{pendingPayments.length} Requests</span>
                   </div>
                   <div className="divide-y divide-slate-100">
                       {pendingPayments.length > 0 ? pendingPayments.map(u => (
                           <div key={u.id} className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50">
                               <div className="flex-1">
                                   <div className="flex items-center gap-3">
                                       <p className="font-bold text-slate-900">{u.fullName}</p>
                                       <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{u.membershipNo}</span>
                                   </div>
                                   <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                       <p className="text-xs text-blue-500 font-bold uppercase mb-1">Payment Remarks / Transaction ID</p>
                                       <p className="text-sm text-slate-700 font-medium">"{u.paymentRemarks}"</p>
                                   </div>
                               </div>
                               <div className="flex items-center gap-3 mt-4 md:mt-0 ml-4">
                                   <button onClick={() => setViewingUser(u)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Eye className="w-5 h-5"/></button>
                                   <button onClick={() => handleApprovePayment(u.id)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-2">
                                       <CheckCircle2 className="w-4 h-4" /> Approve
                                   </button>
                                   <button onClick={() => handleRejectPayment(u.id)} className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm font-bold rounded-lg hover:bg-red-50 flex items-center gap-2">
                                       <XCircle className="w-4 h-4" /> Reject
                                   </button>
                               </div>
                           </div>
                       )) : (
                           <div className="p-8 text-center text-slate-400 italic">No pending payment submissions.</div>
                       )}
                   </div>
               </div>

               {/* SUBMISSION HISTORY */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b border-slate-100">
                       <h3 className="font-bold text-slate-700">Submission History</h3>
                   </div>
                   <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                       {paymentHistory.map(u => (
                           <div key={u.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50">
                               <div>
                                   <p className="font-bold text-slate-900">{u.fullName}</p>
                                   <p className="text-xs text-slate-500">{u.paymentRemarks}</p>
                               </div>
                               <div className="text-right">
                                   {u.paymentStatus === PaymentStatus.PAID ? (
                                       <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">APPROVED</span>
                                   ) : (
                                       <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">REJECTED / UNPAID</span>
                                   )}
                                   <p className="text-[10px] text-slate-400 mt-1">{u.approvedBy ? `by ${u.approvedBy}` : ''}</p>
                               </div>
                           </div>
                       ))}
                       {paymentHistory.length === 0 && <div className="p-6 text-center text-slate-400 text-xs">No history available.</div>}
                   </div>
               </div>
          </div>
      )}

      {/* 6. BENEFITS */}
      {activeTab === 'Benefits' && (
          <div className="space-y-4">
              <div className="flex justify-between">
                   <div className="relative">
                       <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400"/>
                       <input className="pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Search Benefit..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                   </div>
                   <button onClick={() => setIsBenefitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm">
                       <Plus className="w-4 h-4"/> Add Benefit
                   </button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                      <tbody>
                          {filteredBenefits.map(b => (
                              <tr key={b.id} className="border-b hover:bg-slate-50">
                                  <td className="px-6 py-4"><div><p className="font-bold">{b.userName}</p><p className="text-xs text-slate-500">{b.regNo}</p></div></td>
                                  <td className="px-6 py-4">{b.type}</td>
                                  <td className="px-6 py-4 font-mono font-bold">AED {b.amount}</td>
                                  <td className="px-6 py-4 text-xs">{b.date}</td>
                                  <td className="px-6 py-4 text-right"><button onClick={()=>onDeleteBenefit(b.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 7. NOTIFICATIONS */}
      {activeTab === 'Notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800">Send Notification</h3>
                  <input className="w-full p-2 border rounded" placeholder="Title" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} />
                  <textarea className="w-full p-2 border rounded h-24" placeholder="Message..." value={notifMessage} onChange={e=>setNotifMessage(e.target.value)} />
                  <select className="w-full p-2 border rounded" value={notifTarget} onChange={e=>setNotifTarget(e.target.value)}>
                      <option value="ALL">All Members</option>
                      {MANDALAMS.map(m => <option key={m} value={m}>{m} Members</option>)}
                  </select>
                  <button onClick={handleSendNotification} disabled={sendingNotif} className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-primary-dark">{sendingNotif?'Sending...':'Send'}</button>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[500px]">
                   <h3 className="font-bold text-slate-800 mb-4">History</h3>
                   <div className="space-y-4">
                       {notifications.map(n => (
                           <div key={n.id} className="p-3 border rounded hover:bg-slate-50 flex justify-between">
                               <div><p className="font-bold text-sm">{n.title}</p><p className="text-xs text-slate-500">{n.date} • {n.targetAudience}</p></div>
                               <button onClick={()=>onDeleteNotification(n.id)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
      )}

      {/* 8. IMPORT USERS */}
      {activeTab === 'Import Users' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bulk Import Users</h3>
              <p className="text-slate-500 mb-6 text-sm">Upload a CSV file with columns: Name, EmiratesID, Mobile, Emirate, Mandalam, JoinDate(optional).</p>
              
              <div className="mb-6 flex justify-center">
                  <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </div>

              <button 
                onClick={handleImportUsers} 
                disabled={!importFile || isImporting}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark disabled:opacity-50"
              >
                  {isImporting ? `Importing... ${importProgress}` : 'Start Import'}
              </button>
          </div>
      )}

      {/* 9. ADMIN ASSIGN (RESTRICTED TO MASTER ADMIN) */}
      {activeTab === 'Admin Assign' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                  <div className="relative flex-1 mr-4">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Search members to assign role..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {filteredList.slice(0, 100).map(u => (
                          <div key={u.id} className="flex flex-col sm:flex-row justify-between items-center p-3 border rounded-xl hover:bg-slate-50 gap-2 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role !== Role.USER ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                      {u.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-slate-900">{u.fullName}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.role === Role.MASTER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">{u.membershipNo}</span>
                                    </div>
                                  </div>
                              </div>
                              <div className="flex gap-2 flex-wrap justify-end items-center">
                                  {u.role === Role.USER && (
                                      <>
                                          <button onClick={()=>handleAssignAdmin(u, Role.MASTER_ADMIN)} className="text-[10px] bg-purple-600 text-white px-2 py-1.5 rounded font-bold hover:bg-purple-700">Master Admin</button>
                                          <button onClick={()=>handleAssignAdmin(u, Role.MANDALAM_ADMIN)} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded font-bold border border-blue-100 hover:bg-blue-100">Mandalam Admin</button>
                                          <button onClick={()=>handleAssignAdmin(u, Role.CUSTOM_ADMIN)} className="text-[10px] bg-slate-50 text-slate-700 px-2 py-1.5 rounded font-bold border border-slate-100 hover:bg-slate-100">Custom Admin</button>
                                      </>
                                  )}
                                  {u.role !== Role.USER && (
                                      <button onClick={()=>handleAssignAdmin(u, Role.USER)} className="text-[10px] bg-red-50 text-red-700 px-2 py-1.5 rounded font-bold border border-red-100 hover:bg-red-100">Revoke Access</button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 10. REG QUESTIONS (RESTRICTED TO MASTER ADMIN) */}
      {activeTab === 'Reg Questions' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="bg-white p-6 rounded-xl border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                   <div>
                       <h3 className="font-bold text-lg text-slate-900">Registration Questions</h3>
                       <p className="text-slate-500 text-sm">Manage the questions shown during member sign-up.</p>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={async () => { if(confirm("Reset to default recommended questions? This will erase custom questions.")) { await StorageService.seedDefaultQuestions(); setQuestions(await StorageService.getQuestions()); } }} className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors">
                           <RefreshCw className="w-3 h-3"/> Reset Defaults
                       </button>
                       <button onClick={() => { setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1, options: [], systemMapping: 'NONE' }); setIsQuestionModalOpen(true); }} className="flex items-center gap-2 text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-primary-dark transition-colors">
                           <Plus className="w-3 h-3"/> Add Question
                       </button>
                   </div>
               </div>
               
               <div className="space-y-3">
                   {questions.map((q, idx) => (
                       <div key={q.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors bg-white shadow-sm">
                           <div className="flex items-center gap-4">
                               <span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{idx + 1}</span>
                               <div>
                                   <p className="font-bold text-slate-800 text-sm">{q.label} {q.required && <span className="text-red-500">*</span>}</p>
                                   <div className="flex gap-2 mt-1">
                                       <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{q.type}</span>
                                       {q.systemMapping !== 'NONE' && <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded">Mapped: {q.systemMapping}</span>}
                                   </div>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => { setQuestionForm(q); setIsQuestionModalOpen(true); }} className="p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                               <button onClick={async () => { if(confirm("Delete this question permanently?")) { await StorageService.deleteQuestion(q.id); setQuestions(await StorageService.getQuestions()); } }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {/* 11. NEW YEAR (RESTRICTED TO MASTER ADMIN) */}
      {activeTab === 'New Year' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6">
              <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-center max-w-md w-full">
                      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Calendar className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Fiscal Year Management</h3>
                      <p className="text-slate-500 mb-8 leading-relaxed">Start a new financial year to archive current records and reset all member payment statuses to <span className="font-bold text-red-500">Unpaid</span>.</p>
                      
                      <div className="flex flex-col gap-4">
                          <div className="flex gap-2 justify-center items-center">
                              <label className="text-sm font-bold text-slate-600">New Fiscal Year:</label>
                              <input 
                                  type="number" 
                                  className="border p-2 rounded-lg w-32 text-center font-bold text-lg"
                                  value={newYearInput}
                                  onChange={(e) => setNewYearInput(e.target.value)}
                              />
                          </div>
                          
                          <button 
                            onClick={handleStartNewYear} 
                            disabled={isProcessingYear}
                            className="w-full px-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                              {isProcessingYear ? (
                                  <span className="flex items-center justify-center gap-2">
                                      <RefreshCw className="w-5 h-5 animate-spin" /> Processing...
                                  </span>
                              ) : 'Start New Fiscal Year'}
                          </button>
                      </div>
                  </div>
              </div>

              {/* Year History List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b font-bold text-slate-700">Year History</div>
                  {years.map(y => (
                      <div key={y.year} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                              <span className="font-bold text-lg text-slate-800">{y.year}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${y.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {y.status}
                              </span>
                          </div>
                          <button 
                              onClick={() => handleDeleteYear(y.year)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Year"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))}
                  {years.length === 0 && <div className="p-6 text-center text-slate-400">No year history found.</div>}
              </div>
          </div>
      )}

      {/* 12. CARD MGMT (RESTRICTED TO MASTER ADMIN) */}
      {activeTab === 'Card Mgmt' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                              <LayoutTemplate className="w-5 h-5 text-primary" />
                              ID Card Designer
                          </h3>
                          <p className="text-slate-500 text-sm mt-1">Upload distinct designs for Card 1 (Front/Main) and Card 2 (Back/Certificate).</p>
                      </div>
                      <div className="flex gap-4">
                          <div className="bg-slate-100 rounded-lg p-1 flex">
                               <button 
                                 onClick={() => setActiveCardSide('front')}
                                 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'front' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                   Card Design 1
                               </button>
                               <button 
                                 onClick={() => setActiveCardSide('back')}
                                 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'back' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                   Card Design 2
                               </button>
                          </div>
                          <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-colors text-sm">
                              <ImagePlus className="w-4 h-4" />
                              {isUploadingTemplate ? 'Uploading...' : 'Upload Template'}
                              <input type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} disabled={isUploadingTemplate} />
                          </label>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-slate-100 rounded-xl p-4 border border-slate-200 flex items-center justify-center min-h-[400px] select-none relative overflow-hidden">
                          {cardConfig && cardConfig[activeCardSide].templateImage ? (
                              <div 
                                className="relative shadow-2xl inline-block"
                                // onMouseMove removed - handled by window listener
                              >
                                  <img 
                                      ref={cardImageRef}
                                      src={cardConfig[activeCardSide].templateImage} 
                                      alt="Card Template" 
                                      className="max-w-full h-auto rounded-lg pointer-events-none" 
                                  />
                                  {cardConfig[activeCardSide].fields.map(field => (
                                      <div 
                                        key={field.id}
                                        onMouseDown={(e) => handleDragStart(e, field.id)}
                                        style={{ 
                                            position: 'absolute', 
                                            left: `${field.x}%`, 
                                            top: `${field.y}%`, 
                                            transform: 'translate(-50%, -50%)',
                                            color: field.color,
                                            fontSize: `${field.fontSize}px`,
                                            fontWeight: field.fontWeight,
                                            whiteSpace: 'nowrap',
                                            cursor: 'move',
                                            border: draggedFieldId === field.id ? '2px dashed #3b82f6' : '1px dashed transparent',
                                            padding: '4px',
                                            zIndex: 10,
                                            userSelect: 'none'
                                        }}
                                        className="hover:border-slate-400 hover:bg-white/20 transition-all rounded"
                                      >
                                          {field.type === 'QR' ? (
                                              <div className="w-16 h-16 bg-white flex items-center justify-center border border-slate-300">
                                                  <QrCode className="w-10 h-10 text-slate-800" />
                                              </div>
                                          ) : field.sampleValue}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center text-slate-400">
                                  <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                  <p>No template uploaded for {activeCardSide === 'front' ? 'Card 1' : 'Card 2'}.</p>
                              </div>
                          )}
                      </div>

                      <div className="space-y-6">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <h4 className="font-bold text-slate-800 text-sm mb-3">Add Variable to {activeCardSide === 'front' ? 'Card 1' : 'Card 2'}</h4>
                              <div className="flex gap-2">
                                  <select 
                                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none"
                                      value={selectedVariable}
                                      onChange={(e) => setSelectedVariable(e.target.value)}
                                  >
                                      <option value="">-- Select Variable --</option>
                                      <option value="membershipNo">Registration No (ID)</option>
                                      <option value="registrationDate">Joined Date</option>
                                      <option value="qr_code_verify" className="font-bold">🔳 QR Code (Verification)</option>
                                      <optgroup label="Registration Questions">
                                          {questions.map(q => (
                                              <option key={q.id} value={q.id}>{q.label}</option>
                                          ))}
                                      </optgroup>
                                  </select>
                                  <button 
                                      onClick={addCardVariable}
                                      disabled={!selectedVariable || !cardConfig}
                                      className="px-3 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-50"
                                  >
                                      Add
                                  </button>
                              </div>
                          </div>
                          {/* List existing variables */}
                           <div className="space-y-3 max-h-[400px] overflow-y-auto">
                              {cardConfig?.[activeCardSide].fields.map(field => (
                                  <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200">
                                      <div className="flex justify-between items-center mb-1">
                                           <span className="font-bold text-xs flex items-center gap-1 truncate max-w-[150px]">
                                                {field.type === 'QR' && <QrCode className="w-3 h-3 text-blue-500" />}
                                                {field.label}
                                           </span>
                                           <button onClick={() => deleteCardField(field.id)} className="text-red-400"><X className="w-3 h-3"/></button>
                                      </div>
                                      
                                      {/* Position Inputs (New Addition) */}
                                      <div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2 rounded">
                                          <div>
                                              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">X Pos (%)</label>
                                              <input 
                                                  type="number" 
                                                  className="w-full text-xs border rounded p-1 outline-none focus:border-primary" 
                                                  value={Math.round(field.x)} 
                                                  onChange={(e) => updateCardField(field.id, { x: Number(e.target.value) })} 
                                              />
                                          </div>
                                          <div>
                                              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Y Pos (%)</label>
                                              <input 
                                                  type="number" 
                                                  className="w-full text-xs border rounded p-1 outline-none focus:border-primary" 
                                                  value={Math.round(field.y)} 
                                                  onChange={(e) => updateCardField(field.id, { y: Number(e.target.value) })} 
                                              />
                                          </div>
                                      </div>

                                      {field.type !== 'QR' && (
                                          <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Size (px)</label>
                                                  <input type="number" className="w-full text-xs border rounded p-1 outline-none focus:border-primary" value={field.fontSize} onChange={(e) => updateCardField(field.id, { fontSize: Number(e.target.value) })} />
                                              </div>
                                              <div>
                                                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Color</label>
                                                  <input type="color" className="w-full h-7 border rounded p-0 cursor-pointer" value={field.color} onChange={(e) => updateCardField(field.id, { color: e.target.value })} />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODALS --- */}
      {/* Benefit Modal */}
      {isBenefitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Add Benefit Record</h3>
                  <div className="space-y-3">
                      <select className="w-full p-2 border rounded" value={benefitForm.userId} onChange={e=>setBenefitForm({...benefitForm, userId: e.target.value})}>
                          <option value="">Select User...</option>
                          {authorizedUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.membershipNo})</option>)}
                      </select>
                      <select className="w-full p-2 border rounded" value={benefitForm.type} onChange={e=>setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}>
                          {Object.values(BenefitType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className="w-full p-2 border rounded" type="number" placeholder="Amount (AED)" value={benefitForm.amount} onChange={e=>setBenefitForm({...benefitForm, amount: e.target.value})} />
                      <input className="w-full p-2 border rounded" placeholder="Remarks" value={benefitForm.remarks} onChange={e=>setBenefitForm({...benefitForm, remarks: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={()=>setIsBenefitModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleAddBenefitSubmit} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Email Reminder Modal */}
      {showEmailReminderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                              <Mail className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-900">Send Payment Reminder Email</h3>
                              <p className="text-xs text-slate-500">
                                  {getUnpaidEmails().length} recipients selected
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowEmailReminderModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-4">
                      
                      {/* Configuration Warning/Toggle */}
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex justify-between items-center">
                          <span className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4"/> 
                              Powered by EmailJS (Free Tier Limit: 200/mo)
                          </span>
                          <button onClick={() => setShowEmailConfig(!showEmailConfig)} className="underline font-bold flex items-center gap-1">
                              <Settings className="w-3 h-3" /> Configure Keys
                          </button>
                      </div>

                      {showEmailConfig && (
                          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-3 mb-4">
                              <h4 className="font-bold text-slate-800 text-sm">EmailJS Configuration</h4>
                              <p className="text-[10px] text-slate-500">Sign up at <a href="https://www.emailjs.com" target="_blank" className="underline text-blue-600">emailjs.com</a> to get these keys.</p>
                              <input 
                                  className="w-full p-2 border rounded text-xs" 
                                  placeholder="Service ID (e.g., service_xyz)"
                                  value={emailConfig.serviceId}
                                  onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})}
                              />
                              <input 
                                  className="w-full p-2 border rounded text-xs" 
                                  placeholder="Template ID (e.g., template_abc)"
                                  value={emailConfig.templateId}
                                  onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})}
                              />
                              <input 
                                  className="w-full p-2 border rounded text-xs" 
                                  placeholder="Public Key (e.g., user_123)"
                                  value={emailConfig.publicKey}
                                  onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})}
                              />
                              <button onClick={handleSaveEmailConfig} className="bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-bold w-full">Save Configuration</button>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Line</label>
                          <input 
                              className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                              value={emailReminderSubject}
                              onChange={e => setEmailReminderSubject(e.target.value)}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Body</label>
                          <textarea 
                              className="w-full p-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm h-32 resize-none leading-relaxed"
                              value={emailReminderBody}
                              onChange={e => setEmailReminderBody(e.target.value)}
                          />
                      </div>

                      {isSendingEmail && (
                          <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-gray-700">
                              <div className="bg-sky-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${sendingProgress}%` }}></div>
                              <p className="text-center text-xs text-slate-500 mt-1">Sending... {sendingProgress}%</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button 
                          onClick={handleCopyEmails}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors text-sm shadow-sm"
                      >
                          <Copy className="w-4 h-4" /> Copy Addresses
                      </button>
                      <button 
                          onClick={handleSendEmails}
                          disabled={isSendingEmail}
                          className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors text-sm shadow-md shadow-sky-600/20 disabled:opacity-50"
                      >
                          {isSendingEmail ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                              </>
                          ) : (
                              <>
                                <Send className="w-4 h-4" /> Send Emails Now
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mandalam/Custom Admin Modal */}
      {(showMandalamModal || showCustomModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Assign Admin Permissions</h3>
                  {showMandalamModal && (
                      <div className="space-y-2">
                          <p className="text-sm font-bold">Select Mandalams:</p>
                          {MANDALAMS.map(m => (
                              <label key={m} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                                  <input type="checkbox" checked={assignMandalamSel.includes(m as Mandalam)} onChange={e => {
                                      if (e.target.checked) setAssignMandalamSel([...assignMandalamSel, m as Mandalam]);
                                      else setAssignMandalamSel(assignMandalamSel.filter(x => x !== m));
                                  }} />
                                  <span className="text-sm">{m}</span>
                              </label>
                          ))}
                      </div>
                  )}
                  {showCustomModal && (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                          <div>
                              <p className="text-sm font-bold mb-2">Permissions:</p>
                              {ADMIN_PERMISSIONS.map(p => (
                                  <label key={p.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer mb-2">
                                      <input type="checkbox" checked={customPerms.includes(p.id)} onChange={e => {
                                          if (e.target.checked) setCustomPerms([...customPerms, p.id]);
                                          else setCustomPerms(customPerms.filter(x => x !== p.id));
                                      }} />
                                      <span className="text-sm">{p.label}</span>
                                  </label>
                              ))}
                          </div>
                          <div>
                              <p className="text-sm font-bold mb-2">Access Scope (Mandalams):</p>
                              {MANDALAMS.map(m => (
                                  <label key={m} className="flex items-center gap-2 p-2 border rounded cursor-pointer mb-1">
                                      <input type="checkbox" checked={customMandalams.includes(m as Mandalam)} onChange={e => {
                                          if (e.target.checked) setCustomMandalams([...customMandalams, m as Mandalam]);
                                          else setCustomMandalams(customMandalams.filter(x => x !== m));
                                      }} />
                                      <span className="text-sm">{m}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  )}
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => { setShowMandalamModal(false); setShowCustomModal(false); }} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={saveAdminAssignment} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
               <div className="bg-white w-full max-w-2xl rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6 border-b pb-2">
                       <h3 className="font-bold text-lg text-slate-900">Edit User Details</h3>
                       <button onClick={() => setShowEditUserModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Standard System Fields */}
                       <div className="col-span-2">
                           <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                           <input className="w-full border p-2 rounded text-sm" value={editUserForm.fullName || ''} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} />
                       </div>
                       
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Mobile</label>
                           <input className="w-full border p-2 rounded text-sm" value={editUserForm.mobile || ''} onChange={e => setEditUserForm({...editUserForm, mobile: e.target.value})} />
                       </div>
                       
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                           <input className="w-full border p-2 rounded text-sm" value={editUserForm.email || ''} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Emirates ID</label>
                           <input className="w-full border p-2 rounded text-sm" value={editUserForm.emiratesId || ''} onChange={e => setEditUserForm({...editUserForm, emiratesId: e.target.value})} />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                           <input className="w-full border p-2 rounded text-sm" value={editUserForm.password || ''} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Mandalam</label>
                           <select className="w-full border p-2 rounded text-sm bg-white" value={editUserForm.mandalam} onChange={e => setEditUserForm({...editUserForm, mandalam: e.target.value as Mandalam})}>
                               {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                           <select className="w-full border p-2 rounded text-sm bg-white" value={editUserForm.status} onChange={e => setEditUserForm({...editUserForm, status: e.target.value as UserStatus})}>
                               {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                       </div>

                       {/* Dynamic Fields Loop */}
                       {questions.map(q => {
                           // Skip fields we already handled above manually if they are mapped
                           if (['fullName','mobile','email','password','emiratesId','mandalam'].includes(q.systemMapping || '')) return null;

                           let val = '';
                           if (q.systemMapping && q.systemMapping !== 'NONE') {
                               // It's a system field like addressUAE, addressIndia, etc.
                               val = (editUserForm as any)[q.systemMapping] || '';
                           } else {
                               // It's custom data
                               val = editUserForm.customData?.[q.id] || '';
                           }

                           return (
                               <div key={q.id} className={q.type === FieldType.TEXTAREA ? "col-span-2" : ""}>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">{q.label}</label>
                                   {q.type === FieldType.TEXTAREA ? (
                                       <textarea className="w-full border p-2 rounded text-sm h-20 resize-none" value={val} onChange={e => {
                                           const newVal = e.target.value;
                                           if (q.systemMapping && q.systemMapping !== 'NONE') {
                                               setEditUserForm({...editUserForm, [q.systemMapping]: newVal});
                                           } else {
                                               setEditUserForm({...editUserForm, customData: { ...editUserForm.customData, [q.id]: newVal }});
                                           }
                                       }} />
                                   ) : (
                                       <input className="w-full border p-2 rounded text-sm" value={val} onChange={e => {
                                           const newVal = e.target.value;
                                           if (q.systemMapping && q.systemMapping !== 'NONE') {
                                               setEditUserForm({...editUserForm, [q.systemMapping]: newVal});
                                           } else {
                                               setEditUserForm({...editUserForm, customData: { ...editUserForm.customData, [q.id]: newVal }});
                                           }
                                       }} />
                                   )}
                               </div>
                           );
                       })}

                   </div>
                   <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                       <button onClick={() => setShowEditUserModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                       <button onClick={saveEditUser} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Save Changes</button>
                   </div>
               </div>
          </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-lg mb-4">Add New User</h3>
                  <div className="grid grid-cols-1 gap-4">
                      <input className="border p-2 rounded" placeholder="Full Name *" value={newUserForm.fullName || ''} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Mobile *" value={newUserForm.mobile || ''} onChange={e => setNewUserForm({...newUserForm, mobile: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Emirates ID" value={newUserForm.emiratesId || ''} onChange={e => setNewUserForm({...newUserForm, emiratesId: e.target.value})} />
                      <input className="border p-2 rounded" placeholder="Email" value={newUserForm.email || ''} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} />
                      <select className="border p-2 rounded" value={newUserForm.mandalam} onChange={e => setNewUserForm({...newUserForm, mandalam: e.target.value as Mandalam})}>
                           {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleAddNewUser} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Add User</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;

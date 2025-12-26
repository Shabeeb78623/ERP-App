
import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification, CardConfig, CardField } from '../types';
import { Search, Trash2, Eye, Plus, Calendar, Edit, X, Check, ArrowUp, ArrowDown, Wallet, LayoutTemplate, ImagePlus, RefreshCw, AlertCircle, FileUp, Move, Save, BarChart3, PieChart, ShieldAlert, Lock, Download, UserPlus, XCircle, CheckCircle2, QrCode, Building2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS } from '../constants';
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

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  benefits: BenefitRecord[];
  notifications: Notification[];
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  isLoading: boolean;
}

const ALL_TABS = [
  'User Approvals', 'Users Overview', 'Hospital Mgmt', 'Payment Mgmt', 'Payment Subs', 
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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, isLoading }) => {
  const [activeTab, setActiveTab] = useState('User Approvals');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showMandalamModal, setShowMandalamModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  
  // Data States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [years, setYears] = useState<YearConfig[]>([]);

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
  const [newHospitalForm, setNewHospitalForm] = useState({
      name: '',
      email: '',
      password: ''
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
  
  // Ref for Dragging to prevent stale closures in event listeners
  const cardConfigRef = useRef<CardConfig | null>(null);
  useEffect(() => { cardConfigRef.current = cardConfig; }, [cardConfig]);

  // Filter Tabs based on Role
  const visibleTabs = ALL_TABS.filter(tab => {
      // Restricted tabs only for Master Admin
      if (['Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt', 'Import Users', 'Hospital Mgmt'].includes(tab)) {
          return currentUser.role === Role.MASTER_ADMIN;
      }
      return true;
  });

  useEffect(() => {
    setSearchTerm('');
    // If active tab is restricted and user is not master, switch to default
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, currentUser.role]);

  useEffect(() => {
      const loadData = async () => {
          setYears(await StorageService.getYears());
          setQuestions(await StorageService.getQuestions());
          setCardConfig(await StorageService.getCardConfig());
      }
      loadData();
  }, [activeTab, isQuestionModalOpen]);

  // --- DRAG AND DROP LOGIC (WINDOW BASED) ---
  useEffect(() => {
    if (!draggedFieldId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
        const config = cardConfigRef.current;
        if (!config || !cardImageRef.current) return;

        const rect = cardImageRef.current.getBoundingClientRect();
        
        // Calculate coordinates relative to the image
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentage (robust against resizing)
        let xPct = (x / rect.width) * 100;
        let yPct = (y / rect.height) * 100;

        // Clamp to keep inside 0-100%
        xPct = Math.max(0, Math.min(100, xPct));
        yPct = Math.max(0, Math.min(100, yPct));

        const updatedSide = {
            ...config[activeCardSide],
            fields: config[activeCardSide].fields.map(f => f.id === draggedFieldId ? { ...f, x: xPct, y: yPct } : f)
        };

        // Update state locally for smooth UI
        setCardConfig({
            ...config,
            [activeCardSide]: updatedSide
        });
    };

    const handleWindowMouseUp = async () => {
        setDraggedFieldId(null);
        // Save final state to DB
        if (cardConfigRef.current) {
            await StorageService.saveCardConfig(cardConfigRef.current);
        }
    };

    // Attach listeners to window to track mouse even if it leaves the element
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggedFieldId, activeCardSide]);


  // --- FILTERED DATA LOGIC ---
  const getAuthorizedUsers = () => {
    // Hide master admin from lists
    const realUsers = users.filter(u => u.id !== 'admin-master' && u.role !== Role.HOSPITAL_STAFF);
    if (currentUser.role === Role.MASTER_ADMIN) return realUsers;
    if (currentUser.role === Role.MANDALAM_ADMIN) {
        const allowed = currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0 
            ? currentUser.assignedMandalams 
            : [currentUser.mandalam];
        return realUsers.filter(u => allowed.includes(u.mandalam));
    }
    if (currentUser.role === Role.CUSTOM_ADMIN) {
        if (currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0) {
             return realUsers.filter(u => currentUser.assignedMandalams!.includes(u.mandalam));
        }
        return realUsers;
    }
    return [];
  };

  const getHospitalAccounts = () => {
      return users.filter(u => u.role === Role.HOSPITAL_STAFF);
  };

  const authorizedUsers = getAuthorizedUsers();
  const hospitalAccounts = getHospitalAccounts();
  
  const filteredList = authorizedUsers.filter(u => {
      const term = searchTerm.toLowerCase();
      return (
          u.fullName.toLowerCase().includes(term) ||
          u.membershipNo.toLowerCase().includes(term) ||
          u.mobile.includes(term) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          u.emiratesId.includes(term)
      );
  });
  
  // Benefits Filter
  const filteredBenefits = benefits.filter(b => authorizedUsers.some(u => u.id === b.userId) && (
      (b.userName && b.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.regNo && b.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  ));

  // --- HANDLERS ---

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
          await StorageService.updateUser(id, { 
              paymentStatus: PaymentStatus.UNPAID
              // We keep paymentRemarks so history shows they attempted payment
          });
      }
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

  const handleAddHospital = async () => {
      if(!newHospitalForm.name || !newHospitalForm.email || !newHospitalForm.password) return alert("Fill all fields");
      
      const hospitalUser: User = {
          id: `hosp-${Date.now()}`,
          fullName: newHospitalForm.name,
          email: newHospitalForm.email,
          password: newHospitalForm.password,
          role: Role.HOSPITAL_STAFF,
          mobile: '0000000000',
          whatsapp: '',
          emiratesId: '000',
          mandalam: Mandalam.VATAKARA,
          emirate: Emirate.DUBAI,
          status: UserStatus.APPROVED,
          paymentStatus: PaymentStatus.PAID,
          registrationYear: 2025,
          photoUrl: '',
          membershipNo: 'HOSP',
          registrationDate: new Date().toLocaleDateString(),
          isImported: false
      };

      try {
          await StorageService.addUser(hospitalUser);
          setShowAddHospitalModal(false);
          setNewHospitalForm({ name: '', email: '', password: '' });
          alert("Hospital Account Created.");
      } catch (e) {
          console.error(e);
          alert("Failed to create hospital account.");
      }
  };

  // ... (Other handlers same as before)
  
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

  // ... (Import, New Year, Admin Assign handlers same as before) ...
  const handleStartNewYear = async () => {
      const year = new Date().getFullYear() + 1;
      if(!confirm(`Are you sure you want to start the fiscal year ${year}? This will reset payment status for all users.`)) return;
      try {
          await StorageService.createNewYear(year);
          // Reset all users to UNPAID
          const batchPromises = users
            .filter(u => u.role !== Role.MASTER_ADMIN)
            .map(u => StorageService.updateUser(u.id, { paymentStatus: PaymentStatus.UNPAID }));
          
          await Promise.all(batchPromises);
          alert("New Year initialized successfully.");
      } catch (e: any) {
          alert("Error: " + e.message);
      }
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
  
  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) return alert("Enter title and message");
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          let audienceLabel = 'All Members';

          if (notifTarget !== 'ALL') {
              // Targeting specific Mandalam
              recipients = users.filter(u => u.mandalam === notifTarget).map(u => u.id);
              audienceLabel = `${notifTarget} Members`;
          } else if (currentUser.role === Role.MANDALAM_ADMIN) {
              // Mandalam Admin targeting their own users
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
              recipients: recipients // If undefined, it's a true broadcast
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
          // Master or Revoke
          const isRevoke = role === Role.USER;
          const actionName = isRevoke ? "Revoke Admin Rights" : "Grant All Access Admin";
          if(confirm(`${actionName} for ${user.fullName}?`)) {
              await StorageService.updateUser(user.id, { 
                  role: role, 
                  assignedMandalams: [], 
                  permissions: [] // Master admin implies full permissions implicitly
              });
              alert("User role updated successfully.");
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
  
  const saveEditUser = async () => {
      if (!editUserForm.id) return;
      await onUpdateUser(editUserForm.id, editUserForm);
      setShowEditUserModal(false);
      setEditUserForm({});
  };

  // --- CARD MANAGEMENT HANDLERS ---
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

  // --- STATS CARD COMPONENT ---
  const StatCard = ({ label, value, colorClass }: { label: string, value: string | number, colorClass: string }) => (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-500 uppercase font-medium mt-1">{label}</p>
      </div>
  );

  const pendingPayments = filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING);
  const paymentHistory = filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID || (u.paymentStatus === PaymentStatus.UNPAID && u.paymentRemarks));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">Year:</span>
               <select className="bg-white border border-slate-200 text-sm font-bold rounded px-2 py-1 outline-none">
                   <option>2025</option>
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

      {activeTab === 'Users Overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-800 p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3 w-full max-w-md">
                     <Search className="text-slate-400 w-5 h-5" />
                     <input 
                        className="bg-transparent border-none outline-none text-white w-full placeholder-slate-500 text-sm" 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                 </div>
                 <button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                     <UserPlus className="w-4 h-4" /> Add User
                 </button>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500 font-bold">
                         <tr>
                             <th className="px-6 py-4">Reg No</th>
                             <th className="px-6 py-4">Name</th>
                             <th className="px-6 py-4">Mobile</th>
                             <th className="px-6 py-4">Mandalam</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {filteredList.map(u => (
                             <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4 font-mono font-bold text-slate-700">{u.membershipNo}</td>
                                 <td className="px-6 py-4 font-bold text-slate-900">{u.fullName}</td>
                                 <td className="px-6 py-4 text-slate-600">{u.mobile}</td>
                                 <td className="px-6 py-4 text-slate-600">{u.mandalam}</td>
                                 <td className="px-6 py-4">
                                     <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${u.status === UserStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                         {u.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right flex justify-end gap-2">
                                     <button onClick={() => setViewingUser(u)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye className="w-5 h-5"/></button>
                                     <button onClick={() => { setEditUserForm(u); setShowEditUserModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"><Edit className="w-5 h-5"/></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
      )}

      {/* HOSPITAL MANAGEMENT TAB */}
      {activeTab === 'Hospital Mgmt' && currentUser.role === Role.MASTER_ADMIN && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Hospital Accounts</h3>
                  <button onClick={() => setShowAddHospitalModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Hospital
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hospitalAccounts.map(h => (
                      <div key={h.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                  <Building2 className="w-6 h-6" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-900">{h.fullName}</h4>
                                  <p className="text-xs text-slate-500">{h.email}</p>
                              </div>
                          </div>
                          <div className="flex justify-between text-sm mt-4 pt-4 border-t border-slate-100">
                               <span className="text-slate-500">Password: <span className="font-mono text-slate-700">{h.password}</span></span>
                               <button onClick={async () => { if(confirm("Delete Hospital Account?")) { await StorageService.updateUser(h.id, { status: UserStatus.REJECTED }); alert("Deleted"); }}} className="text-red-500 font-bold hover:underline">Remove</button>
                          </div>
                      </div>
                  ))}
                  {hospitalAccounts.length === 0 && (
                      <div className="col-span-full text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                          No hospital accounts created yet.
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'Payment Mgmt' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex justify-between">
                   <h3 className="font-bold">Payment Management</h3>
                   <input className="px-3 py-1 rounded border text-sm" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
               </div>
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                       <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr>
                   </thead>
                   <tbody>
                       {filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).map(u => (
                           <tr key={u.id} className="border-b">
                               <td className="px-6 py-4">
                                   <p className="font-bold">{u.fullName}</p>
                                   <p className="text-xs text-slate-500">{u.membershipNo}</p>
                               </td>
                               <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold ${u.paymentStatus==='PENDING'?'bg-orange-100 text-orange-700':'bg-red-50 text-red-500'}`}>{u.paymentStatus}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                   <button onClick={() => setViewingUser(u)} className="mr-2 p-1 bg-slate-100 rounded"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => handleApprovePayment(u.id)} className="px-3 py-1 bg-primary text-white text-xs rounded font-bold">Mark Paid</button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      )}

      {activeTab === 'Payment Subs' && (
          <div className="space-y-6">
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

      {/* ... (Benefits, Notifications, Import Users, Admin Assign, Reg Questions, New Year tabs same as before) */}

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
                          <p className="text-slate-500 text-sm mt-1">Configure designs for Ahalia Hospital and LLH Hospital Cards.</p>
                      </div>
                      <div className="flex gap-4">
                          <div className="bg-slate-100 rounded-lg p-1 flex">
                               <button 
                                 onClick={() => setActiveCardSide('front')}
                                 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'front' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                   Ahalia Card
                               </button>
                               <button 
                                 onClick={() => setActiveCardSide('back')}
                                 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeCardSide === 'back' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                               >
                                   LLH Card
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
                              <div className="relative shadow-2xl inline-block">
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
                                  <p>No template uploaded for {activeCardSide === 'front' ? 'Ahalia Card' : 'LLH Card'}.</p>
                              </div>
                          )}
                      </div>

                      <div className="space-y-6">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <h4 className="font-bold text-slate-800 text-sm mb-3">Add Variable to {activeCardSide === 'front' ? 'Ahalia' : 'LLH'}</h4>
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
                                      {field.type !== 'QR' && (
                                          <div className="grid grid-cols-2 gap-2">
                                              <input type="number" className="w-full text-xs border rounded" value={field.fontSize} onChange={(e) => updateCardField(field.id, { fontSize: Number(e.target.value) })} />
                                              <input type="color" className="w-full h-5 border rounded p-0" value={field.color} onChange={(e) => updateCardField(field.id, { color: e.target.value })} />
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
      {/* Benefit Modal, Mandalam/Custom Admin Modal, Edit User Modal, Add User Modal same as before */}

      {/* Add Hospital Modal */}
      {showAddHospitalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Create Hospital Account</h3>
                  <div className="space-y-3">
                      <input className="w-full p-2 border rounded" placeholder="Hospital Name (e.g. Ahalia Hospital)" value={newHospitalForm.name} onChange={e=>setNewHospitalForm({...newHospitalForm, name: e.target.value})} />
                      <input className="w-full p-2 border rounded" placeholder="Login Email" value={newHospitalForm.email} onChange={e=>setNewHospitalForm({...newHospitalForm, email: e.target.value})} />
                      <input className="w-full p-2 border rounded" type="password" placeholder="Password" value={newHospitalForm.password} onChange={e=>setNewHospitalForm({...newHospitalForm, password: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={()=>setShowAddHospitalModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleAddHospital} className="px-4 py-2 bg-primary text-white rounded">Create Account</button>
                  </div>
              </div>
          </div>
      )}

      {/* Question Modal */}
      {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
                   {/* ... (Existing Question Modal Content) ... */}
                   <h3 className="font-bold text-lg text-slate-900 border-b pb-2">
                      {questionForm.id ? 'Edit Question' : 'Add New Question'}
                  </h3>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Question Label</label>
                      <input className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. What is your profession?" value={questionForm.label || ''} onChange={e => setQuestionForm({...questionForm, label: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">System Field Map</label>
                          <select className="w-full border p-2 rounded text-sm bg-slate-50" value={questionForm.systemMapping || 'NONE'} onChange={e => setQuestionForm({...questionForm, systemMapping: e.target.value as any})}>
                              {SYSTEM_FIELD_MAPPING.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Input Type</label>
                          <select className="w-full border p-2 rounded text-sm bg-slate-50" value={questionForm.type} onChange={e => setQuestionForm({...questionForm, type: e.target.value as FieldType})}>
                              {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                  </div>

                  <div>
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={questionForm.required} onChange={e => setQuestionForm({...questionForm, required: e.target.checked})} />
                           <span className="text-sm font-bold text-slate-700">Required Field</span>
                       </label>
                  </div>

                  {(questionForm.type === FieldType.DROPDOWN || questionForm.type === FieldType.DEPENDENT_DROPDOWN) && (
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                           <p className="text-xs font-bold mb-2 uppercase text-slate-500">Dropdown Options</p>
                           <div className="flex gap-2 mb-3">
                               <input className="flex-1 border p-2 text-sm rounded outline-none" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Type new option..." onKeyDown={e => {
                                   if (e.key === 'Enter' && newOption) {
                                       setQuestionForm({...questionForm, options: [...(questionForm.options||[]), newOption]}); setNewOption('');
                                   }
                               }} />
                               <button onClick={() => { if(newOption) { setQuestionForm({...questionForm, options: [...(questionForm.options||[]), newOption]}); setNewOption(''); } }} className="px-4 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark">Add</button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                               {questionForm.options?.map(o => (
                                   <span key={o} className="bg-white px-3 py-1 rounded-full border shadow-sm text-xs flex items-center gap-2 text-slate-700">
                                       {o} <button onClick={() => setQuestionForm({...questionForm, options: questionForm.options?.filter(x => x !== o)})}><X className="w-3 h-3 text-red-500 hover:text-red-700"/></button>
                                   </span>
                               ))}
                           </div>
                       </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <button onClick={() => setIsQuestionModalOpen(false)} className="px-5 py-2.5 bg-slate-100 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                      <button onClick={async () => { 
                          if(questionForm.label) { 
                              await StorageService.saveQuestion({ ...questionForm, id: questionForm.id || `q_${Date.now()}` } as RegistrationQuestion); 
                              setQuestions(await StorageService.getQuestions()); 
                              setIsQuestionModalOpen(false); 
                          } else {
                              alert("Label is required");
                          }
                      }} className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">Save Question</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* View User Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl">
                 <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">{viewingUser.fullName}</h3>
                        <p className="text-slate-500 text-sm">{viewingUser.membershipNo}</p>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm max-h-[60vh] overflow-y-auto pr-2">
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Mobile</p><p className="font-medium">{viewingUser.mobile}</p></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Emirates ID</p><p className="font-medium">{viewingUser.emiratesId}</p></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Mandalam</p><p className="font-medium">{viewingUser.mandalam}</p></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                        <span className={`px-2 py-0.5 text-xs rounded font-bold ${viewingUser.status===UserStatus.APPROVED?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{viewingUser.status}</span>
                    </div>
                    <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Address (UAE)</p><p className="font-medium text-slate-700">{viewingUser.addressUAE || '-'}</p></div>
                    
                    {/* Dynamic Fields */}
                    {viewingUser.customData && Object.entries(viewingUser.customData).map(([k,v]) => {
                         const q = questions.find(q=>q.id===k);
                         if(!q) return null;
                         return (
                             <div key={k} className="col-span-2 border-t border-dashed border-slate-100 pt-3">
                                 <p className="text-xs font-bold text-slate-400 uppercase">{q.label}</p>
                                 <p className="font-medium text-slate-700 break-words">{String(v)}</p>
                             </div>
                         )
                    })}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;

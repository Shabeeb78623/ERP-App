
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType } from '../types';
import { Search, Upload, Trash2, Eye, Plus, Shield, Calendar, UserPlus, Edit, Save, X, Filter, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS, EMIRATES } from '../constants';

interface AdminDashboardProps {
  users: User[];
  benefits: BenefitRecord[];
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
  isLoading: boolean;
}

const TABS = [
  'User Approvals', 'Users Overview', 'Users Data', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Import Users', 'Admin Assign', 'Reg Questions', 'New Year'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, benefits, stats, onUpdateUser, onAddBenefit, onDeleteBenefit, isLoading }) => {
  const [activeTab, setActiveTab] = useState('Users Overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [years, setYears] = useState<YearConfig[]>([]);
  
  // Questions State
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<RegistrationQuestion>>({
      type: FieldType.TEXT,
      required: true,
      order: 0,
      dependentOptions: {}
  });
  const [depParentOption, setDepParentOption] = useState('');
  const [depChildOptions, setDepChildOptions] = useState('');

  // Benefit Search State
  const [benefitUserSearch, setBenefitUserSearch] = useState('');
  const [benefitForm, setBenefitForm] = useState({
      userId: '',
      type: BenefitType.HOSPITAL,
      amount: '',
      remarks: ''
  });

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  // Overview Filters
  const [filterMandalam, setFilterMandalam] = useState('All Mandalams');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterPayment, setFilterPayment] = useState('All Payment');

  useEffect(() => {
      const loadYears = async () => {
          const y = await StorageService.getYears();
          setYears(y);
      }
      const loadQuestions = async () => {
          const qs = await StorageService.getQuestions();
          setQuestions(qs);
      }
      loadYears();
      loadQuestions();
  }, [activeTab]);

  const visibleUsers = users.filter(u => u.role !== Role.MASTER_ADMIN);

  const filterUsers = (list: User[], term: string) => {
      let filtered = list;
      
      // Text Search
      if (term) {
          const lowerTerm = term.toLowerCase();
          filtered = filtered.filter(u => 
            u.fullName.toLowerCase().includes(lowerTerm) ||
            u.membershipNo.toLowerCase().includes(lowerTerm) ||
            u.mobile.includes(lowerTerm) ||
            (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
            u.emiratesId.includes(lowerTerm)
          );
      }

      // Dropdown Filters
      if (activeTab === 'Users Overview') {
          if (filterMandalam !== 'All Mandalams') filtered = filtered.filter(u => u.mandalam === filterMandalam);
          if (filterStatus !== 'All Status') filtered = filtered.filter(u => u.status === filterStatus);
          if (filterRole !== 'All Roles') filtered = filtered.filter(u => u.role === filterRole);
          if (filterPayment !== 'All Payment') filtered = filtered.filter(u => u.paymentStatus === filterPayment);
      }

      return filtered;
  };

  // --- IMPORT LOGIC (ROBUST) ---
  const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
              inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
          } else {
              current += char;
          }
      }
      result.push(current.trim());
      return result;
  };

  const handleImportCSV = () => {
      if (!importFile) return;
      setIsImporting(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
          setTimeout(async () => {
            try {
                const text = e.target?.result as string;
                // Split by newline but handle possible carriage returns
                const rows = text.split(/\r?\n/);
                // Skip header (index 0)
                const dataRows = rows.slice(1);
                
                const currentYear = new Date().getFullYear();
                let currentSeq = await StorageService.getNextSequence(currentYear);
                const newUsers: User[] = [];

                for (const row of dataRows) {
                    if (!row.trim()) continue;
                    
                    const cols = parseCSVLine(row);
                    
                    // Expectation: Name (0), EID (1), Mobile (2), Mandalam (3)
                    if (cols.length >= 3) {
                         // 1. Name (Remove quotes if logic missed them, though parser handles it)
                         const fullName = cols[0].replace(/^"|"$/g, '');
                         
                         // 2. Emirates ID - Handle Scientific Notation e.g. 7.84E+14
                         let emiratesId = cols[1];
                         if (emiratesId.includes('E+') || emiratesId.includes('.')) {
                             // Convert scientific to number then to string to get full digits
                             emiratesId = Number(emiratesId).toLocaleString('fullwide', { useGrouping: false });
                         }
                         // Basic cleaning of non-digits
                         emiratesId = emiratesId.replace(/[^0-9]/g, '');

                         // 3. Mobile - Handle Scientific Notation
                         let mobile = cols[2];
                         if (mobile.includes('E+') || mobile.includes('.')) {
                             mobile = Number(mobile).toLocaleString('fullwide', { useGrouping: false });
                         }
                         mobile = mobile.replace(/[^0-9]/g, '');

                         // 4. Mandalam - Fuzzy Match
                         const csvMandalamRaw = cols[3] ? cols[3].trim() : '';
                         let assignedMandalam = Mandalam.BALUSHERI; // Default
                         
                         if (csvMandalamRaw) {
                             const input = csvMandalamRaw.toLowerCase().replace(/[^a-z]/g, ''); // remove spaces, special chars
                             
                             // Mapping common variations
                             for (const m of Object.values(Mandalam)) {
                                 const target = m.toLowerCase().replace(/[^a-z]/g, '');
                                 if (input.includes(target) || target.includes(input)) {
                                     assignedMandalam = m;
                                     break;
                                 }
                                 // Specific overrides for common misspellings
                                 if(input.includes('koy') || input.includes('coil')) assignedMandalam = Mandalam.KOYLANDI;
                                 if(input.includes('kunna')) assignedMandalam = Mandalam.KUNNAMANGALAM;
                                 if(input.includes('bep')) assignedMandalam = Mandalam.BEPUR;
                                 if(input.includes('vata') || input.includes('vada')) assignedMandalam = Mandalam.VADAKARA;
                             }
                         }

                         if (fullName && mobile && emiratesId) {
                             const membershipNo = `${currentYear}${currentSeq.toString().padStart(4, '0')}`;
                             currentSeq++; 
                             
                             newUsers.push({
                                 id: `imported-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
                                 fullName,
                                 mobile,
                                 whatsapp: mobile,
                                 emiratesId, // Stored as clean string of digits
                                 mandalam: assignedMandalam, 
                                 emirate: Emirate.DUBAI,
                                 status: UserStatus.APPROVED,
                                 paymentStatus: PaymentStatus.UNPAID,
                                 role: Role.USER,
                                 registrationYear: currentYear,
                                 photoUrl: '',
                                 membershipNo: membershipNo,
                                 registrationDate: new Date().toLocaleDateString(),
                                 password: emiratesId, // Default password is EID
                                 isImported: true 
                             });
                         }
                    }
                }

                const added = await StorageService.addUsers(newUsers);
                alert(`Successfully imported ${added.length} users.`);
            } catch (error) {
                console.error(error);
                alert("Error parsing CSV. Check console for details.");
            } finally {
                setIsImporting(false);
                setImportFile(null);
            }
          }, 100);
      };
      reader.readAsText(importFile);
  };

  // ... (Existing logic for Questions, Notifications, New Year, Edit User) ...

  // --- QUESTIONS LOGIC RE-INCLUDED TO ENSURE FUNCTIONALITY ---
  const handleSaveQuestion = async () => {
      if (!questionForm.label) return alert("Label is required");
      
      const newQuestion: RegistrationQuestion = {
          id: questionForm.id || `q-${Date.now()}`,
          label: questionForm.label,
          type: questionForm.type || FieldType.TEXT,
          required: questionForm.required || false,
          order: questionForm.order || questions.length,
          options: questionForm.options,
          placeholder: questionForm.placeholder,
          parentQuestionId: questionForm.parentQuestionId,
          dependentOptions: questionForm.dependentOptions
      };

      await StorageService.saveQuestion(newQuestion);
      setQuestions(await StorageService.getQuestions());
      setIsQuestionModalOpen(false);
      setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length, dependentOptions: {} });
      setDepParentOption('');
      setDepChildOptions('');
  };

  const handleDeleteQuestion = async (id: string) => {
      if(confirm("Delete this question?")) {
          await StorageService.deleteQuestion(id);
          setQuestions(await StorageService.getQuestions());
      }
  };

  const moveQuestion = async (index: number, direction: 'up' | 'down') => {
      const newQs = [...questions];
      if (direction === 'up' && index > 0) {
          [newQs[index], newQs[index - 1]] = [newQs[index - 1], newQs[index]];
      } else if (direction === 'down' && index < newQs.length - 1) {
          [newQs[index], newQs[index + 1]] = [newQs[index + 1], newQs[index]];
      }
      newQs.forEach((q, i) => q.order = i);
      for (const q of newQs) {
          await StorageService.saveQuestion(q);
      }
      setQuestions(newQs);
  };

  const addDependentMapping = () => {
      if (!depParentOption || !depChildOptions) return;
      const currentDeps = questionForm.dependentOptions || {};
      const childOptsArray = depChildOptions.split(',').map(s => s.trim());
      
      setQuestionForm({
          ...questionForm,
          dependentOptions: {
              ...currentDeps,
              [depParentOption]: childOptsArray
          }
      });
      setDepParentOption('');
      setDepChildOptions('');
  };

  // ... (Benefit Submit logic, Notification Send Logic) ...
  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      
      const newBenefit: BenefitRecord = {
          id: `benefit-${Date.now()}`,
          userId: benefitForm.userId,
          userName: user?.fullName,
          regNo: user?.membershipNo,
          type: benefitForm.type,
          amount: Number(benefitForm.amount),
          remarks: benefitForm.remarks,
          date: new Date().toLocaleDateString()
      };

      onAddBenefit(newBenefit);
      setIsBenefitModalOpen(false);
      setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
      setBenefitUserSearch('');
  };

  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) {
          alert("Please enter title and message");
          return;
      }
      const recipients = notifTarget === 'ALL' ? undefined : visibleUsers.filter(u => u.mandalam === notifTarget).map(u => u.id);

      await StorageService.addNotification({
          id: `notif-${Date.now()}`,
          title: notifTitle,
          message: notifMessage,
          date: new Date().toLocaleDateString(),
          read: false,
          type: 'BROADCAST',
          targetAudience: notifTarget === 'ALL' ? 'All Members' : `${notifTarget} Members`,
          recipients
      });

      alert("Notification sent successfully");
      setNotifTitle('');
      setNotifMessage('');
  };

  const handleCreateNewYear = async () => {
      const maxYear = years.reduce((max, y) => Math.max(max, y.year), 0);
      const newYearVal = maxYear + 1;
      if (window.confirm(`Initialize Year ${newYearVal}? This will archive ${maxYear}.`)) {
          try {
              await StorageService.createNewYear(newYearVal);
              const updatedYears = await StorageService.getYears();
              setYears(updatedYears);
          } catch(e: any) { alert(e.message); }
      }
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setEditForm({ ...user });
  };

  const saveEditedUser = () => {
      if (editingUser && editForm) {
          onUpdateUser(editingUser.id, editForm);
          setEditingUser(null);
          setEditForm({});
      }
  };

  const filteredUsersForBenefit = visibleUsers.filter(u => 
      u.fullName.toLowerCase().includes(benefitUserSearch.toLowerCase()) || 
      u.membershipNo.toLowerCase().includes(benefitUserSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
            { label: 'Total Users', value: stats.total, color: 'text-primary' },
            { label: 'New', value: stats.new, color: 'text-emerald-600' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-500' },
            { label: 'Paid', value: stats.paid, color: 'text-blue-600' },
            { label: 'Revenue', value: `AED ${stats.collected}`, color: 'text-slate-800' }
        ].map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h3>
            </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 whitespace-nowrap text-sm font-medium rounded-full transition-all ${
              activeTab === tab 
                ? 'bg-primary text-white shadow-md shadow-blue-900/20' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Panels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[600px] p-6">
        
        {/* --- REG QUESTIONS TAB (FEATURED) --- */}
        {activeTab === 'Reg Questions' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Registration Form Builder</h3>
                        <p className="text-slate-500 text-sm">Configure fields for new member sign-ups.</p>
                    </div>
                    <button onClick={() => {
                        setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length, dependentOptions: {} });
                        setIsQuestionModalOpen(true);
                    }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-dark">
                        <Plus className="w-4 h-4" /> Add Question
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <button disabled={idx === 0} onClick={() => moveQuestion(idx, 'up')} className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                    <button disabled={idx === questions.length - 1} onClick={() => moveQuestion(idx, 'down')} className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{q.label} {q.required && <span className="text-red-500">*</span>}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{q.type.replace('_', ' ')}</span>
                                        {q.parentQuestionId && <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Dependent</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        setQuestionForm({ ...q });
                                        setIsQuestionModalOpen(true);
                                    }}
                                    className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:text-primary"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {questions.length === 0 && <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">No custom questions added. Default fields will be used.</div>}
                </div>
            </div>
        )}

        {/* --- IMPORT USERS TAB (FIXED) --- */}
        {activeTab === 'Import Users' && (
            <div className="max-w-xl mx-auto text-center py-12">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                    <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Bulk User Import</h3>
                <div className="text-left bg-slate-50 p-4 rounded-xl text-sm text-slate-600 mb-6 space-y-2 border border-slate-200">
                    <p><strong>CSV Format Requirements:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Row 1: Header (Ignored)</li>
                        <li>Column 1: <strong>Full Name</strong> (e.g. "John Doe")</li>
                        <li>Column 2: <strong>Emirates ID</strong> (e.g. 784123412345671)</li>
                        <li>Column 3: <strong>Mobile Number</strong> (e.g. 0501234567)</li>
                        <li>Column 4: <strong>Mandalam</strong> (Auto-detected, e.g. "Vadakara")</li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-2">* Scientific notation in Excel (7.84E+14) is automatically fixed.</p>
                    <p className="text-xs text-slate-500">* Names with spaces or commas are handled safely.</p>
                </div>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 mb-6 hover:border-primary transition-colors relative bg-slate-50">
                    <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">{importFile ? importFile.name : "Click or Drop CSV file here"}</span>
                </div>
                <button onClick={handleImportCSV} disabled={!importFile || isImporting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-blue-900/10 disabled:opacity-50 transition-all">
                    {isImporting ? 'Processing Import...' : 'Start Import'}
                </button>
            </div>
        )}
        
        {/* ... (Standard rendering for other tabs: Overview, Data, Payment, etc. - kept consistent) ... */}
        {activeTab === 'Users Overview' && (
             <div className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                         <h3 className="text-lg font-bold text-slate-800">Users Overview</h3>
                         <p className="text-slate-500 text-sm">Brief summary of all registered members.</p>
                     </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Filters */}
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterMandalam} onChange={e => setFilterMandalam(e.target.value)}>
                        <option>All Mandalams</option>
                        {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All Status</option>
                        {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>

                 <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                            <tr>
                                <th className="px-4 py-3">Reg No</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Mobile</th>
                                <th className="px-4 py-3">Emirates ID</th>
                                <th className="px-4 py-3">Mandalam</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filterUsers(visibleUsers, searchTerm).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                                    <td className="px-4 py-3 font-mono text-slate-500">{user.membershipNo}</td>
                                    <td className="px-4 py-3 font-bold text-slate-900">{user.fullName}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.mobile}</td>
                                    <td className="px-4 py-3 text-slate-600 font-mono tracking-wide">{user.emiratesId}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.mandalam}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            user.status === UserStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 
                                            user.status === UserStatus.REJECTED ? 'bg-red-50 text-red-600' : 
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {/* Users Data Tab */}
        {activeTab === 'Users Data' && (
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Users Data</h3>
                        <p className="text-slate-500 text-sm">Full profile management.</p>
                     </div>
                     <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search user..." 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                 </div>
                 <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Reg No</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filterUsers(visibleUsers, searchTerm).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.membershipNo}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{user.fullName}</td>
                                    <td className="px-6 py-4 text-slate-500">
                                        <div className="text-xs">{user.mobile}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                                        >
                                            <Edit className="w-3 h-3" /> View / Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}
        {/* ... Other tabs ... */}

      </div>

      {/* --- MODALS (Questions, Benefit, Edit User) are kept same as previous iteration for consistency --- */}
      {/* Question Editor Modal */}
      {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-xl text-slate-900">{questionForm.id ? 'Edit Question' : 'Add Question'}</h3>
                  {/* Question Form Fields */}
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label</label>
                          <input className="w-full p-3 border border-slate-200 rounded-xl" value={questionForm.label || ''} onChange={e => setQuestionForm({...questionForm, label: e.target.value})} placeholder="e.g. Full Name" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                              <select className="w-full p-3 border border-slate-200 rounded-xl" value={questionForm.type} onChange={e => setQuestionForm({...questionForm, type: e.target.value as FieldType})}>
                                  {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div className="flex items-end pb-3">
                              <label className="flex items-center gap-2 font-bold text-sm">
                                  <input type="checkbox" checked={questionForm.required} onChange={e => setQuestionForm({...questionForm, required: e.target.checked})} /> Required
                              </label>
                          </div>
                      </div>
                      {/* Dropdown Options Logic */}
                      {questionForm.type === FieldType.DROPDOWN && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Options (Comma Separated)</label>
                              <input className="w-full p-3 border border-slate-200 rounded-xl" value={questionForm.options?.join(', ') || ''} onChange={e => setQuestionForm({...questionForm, options: e.target.value.split(',').map(s => s.trim())})} placeholder="Option 1, Option 2" />
                          </div>
                      )}
                      {/* Dependent Dropdown Logic */}
                      {questionForm.type === FieldType.DEPENDENT_DROPDOWN && (
                          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <p className="text-sm font-bold text-slate-700">Dependency Configuration</p>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parent Question</label>
                                  <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={questionForm.parentQuestionId || ''} onChange={e => setQuestionForm({...questionForm, parentQuestionId: e.target.value})}>
                                      <option value="">Select Parent...</option>
                                      {questions.filter(q => q.id !== questionForm.id && q.type === FieldType.DROPDOWN).map(q => (
                                          <option key={q.id} value={q.id}>{q.label}</option>
                                      ))}
                                  </select>
                              </div>
                              {questionForm.parentQuestionId && (
                                  <div className="space-y-2 border-t border-slate-200 pt-2">
                                      <p className="text-xs font-bold text-slate-500">Map Parent Option to Child Options</p>
                                      <div className="flex gap-2">
                                          <select className="w-1/3 p-2 border border-slate-200 rounded-lg text-sm" value={depParentOption} onChange={e => setDepParentOption(e.target.value)}>
                                              <option value="">Parent Opt...</option>
                                              {questions.find(q => q.id === questionForm.parentQuestionId)?.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                          </select>
                                          <input className="flex-1 p-2 border border-slate-200 rounded-lg text-sm" placeholder="Child options (comma sep)" value={depChildOptions} onChange={e => setDepChildOptions(e.target.value)} />
                                          <button onClick={addDependentMapping} className="px-3 bg-slate-800 text-white rounded-lg text-xs"><Plus className="w-4 h-4" /></button>
                                      </div>
                                      <div className="space-y-1 mt-2">
                                          {Object.entries(questionForm.dependentOptions || {}).map(([parentOpt, childOpts]) => (
                                              <div key={parentOpt} className="flex justify-between text-xs bg-white p-2 rounded border border-slate-100">
                                                  <span><strong>{parentOpt}</strong> → {(childOpts as string[]).join(', ')}</span>
                                                  <button className="text-red-500" onClick={() => {
                                                      const newDep = {...questionForm.dependentOptions};
                                                      delete newDep[parentOpt];
                                                      setQuestionForm({...questionForm, dependentOptions: newDep});
                                                  }}><X className="w-3 h-3" /></button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  <div className="flex gap-3 pt-4">
                      <button onClick={() => setIsQuestionModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button onClick={handleSaveQuestion} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20">Save Question</button>
                  </div>
              </div>
          </div>
      )}

      {/* Benefit Modal & Edit User Modal (Same as before) ... */}
       {isBenefitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-6">
                  <h3 className="font-bold text-xl text-slate-900">Add Benefit</h3>
                  <div className="space-y-4">
                      <div className="relative">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Search Member</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-primary"
                            placeholder="Type name or reg no..."
                            value={benefitUserSearch}
                            onChange={(e) => setBenefitUserSearch(e.target.value)}
                          />
                          {benefitUserSearch && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-lg rounded-xl mt-1 max-h-40 overflow-y-auto z-10">
                                  {filteredUsersForBenefit.map(u => (
                                      <div 
                                        key={u.id} 
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                        onClick={() => {
                                            setBenefitForm({...benefitForm, userId: u.id});
                                            setBenefitUserSearch(u.fullName);
                                        }}
                                      >
                                          <p className="font-bold text-sm text-slate-900">{u.fullName}</p>
                                          <p className="text-xs text-slate-500">{u.membershipNo}</p>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                      
                      {benefitForm.userId && (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                              <Check className="w-4 h-4" /> Selected: {users.find(u => u.id === benefitForm.userId)?.fullName}
                          </div>
                      )}

                      <div className="flex gap-4">
                          <select className="w-1/2 p-3 border border-slate-200 rounded-xl outline-none" value={benefitForm.type} onChange={(e) => setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}>
                              {Object.values(BenefitType).map(t => <option key={t}>{t}</option>)}
                          </select>
                          <input className="w-1/2 p-3 border border-slate-200 rounded-xl outline-none" type="number" placeholder="Amount" value={benefitForm.amount} onChange={(e) => setBenefitForm({...benefitForm, amount: e.target.value})} />
                      </div>
                      <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-24 resize-none" placeholder="Remarks" value={benefitForm.remarks} onChange={(e) => setBenefitForm({...benefitForm, remarks: e.target.value})}></textarea>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setIsBenefitModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button onClick={handleAddBenefitSubmit} disabled={!benefitForm.userId} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
      )}

      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-xl text-slate-900">Edit Member Profile</h3>
                        <p className="text-xs text-slate-500">{editingUser.membershipNo}</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase">Identity</label>
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Full Name" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Emirates ID (784-xxxx-xxxxxxx-x)" value={editForm.emiratesId || ''} onChange={e => setEditForm({...editForm, emiratesId: e.target.value})} />
                              <div className="grid grid-cols-2 gap-4">
                                 <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as UserStatus})}>
                                     {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                                 <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as Role})}>
                                     {Object.values(Role).filter(r => r !== Role.MASTER_ADMIN).map(r => <option key={r} value={r}>{r}</option>)}
                                 </select>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase">Contact</label>
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Mobile" value={editForm.mobile || ''} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="WhatsApp" value={editForm.whatsapp || ''} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} />
                          </div>
                      </div>
                      {/* ... (rest of edit modal) ... */}
                      <div className="space-y-4">
                           <label className="block text-xs font-bold text-slate-400 uppercase">Addresses</label>
                           <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 resize-none" placeholder="Address UAE" value={editForm.addressUAE || ''} onChange={e => setEditForm({...editForm, addressUAE: e.target.value})}></textarea>
                           <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 resize-none" placeholder="Address India" value={editForm.addressIndia || ''} onChange={e => setEditForm({...editForm, addressIndia: e.target.value})}></textarea>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(null)} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white">Cancel</button>
                      <button onClick={saveEditedUser} className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;

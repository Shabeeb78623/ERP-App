
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import Communications from './components/Communications';
import MembershipCard from './components/MembershipCard';
import Auth from './components/Auth';
import { UserBenefits, AccountSettings, UserNotifications } from './components/UserViews';
import { StorageService } from './services/storageService';
import { ViewState, Role, User, DashboardStats, UserStatus, PaymentStatus, BenefitRecord } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('AUTH');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [benefits, setBenefits] = useState<BenefitRecord[]>([]);
  
  const [viewMode, setViewMode] = useState<'ADMIN' | 'USER'>('USER');

  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState({
      email: '',
      password: '',
      addressUAE: '',
      addressIndia: '',
      nominee: '',
      relation: 'Father'
  });

  // Fetch Data Function
  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [loadedUsers, loadedBenefits] = await Promise.all([
              StorageService.getUsers(),
              StorageService.getBenefits()
          ]);
          setUsers(loadedUsers);
          setBenefits(loadedBenefits);
      } catch (error) {
          console.error("Failed to load data", error);
          alert("Failed to connect to database. Please check your internet.");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live Reload wrapper for updates
  const refreshData = async () => {
      const [loadedUsers, loadedBenefits] = await Promise.all([
          StorageService.getUsers(),
          StorageService.getBenefits()
      ]);
      setUsers(loadedUsers);
      setBenefits(loadedBenefits);
      
      // Update current user if logged in
      if (currentUser) {
          const updatedCurrent = loadedUsers.find(u => u.id === currentUser.id);
          if (updatedCurrent) setCurrentUser(updatedCurrent);
      }
  };

  const stats: DashboardStats = {
      total: users.length - 1, 
      new: users.filter(u => u.registrationYear === 2025 && u.role !== Role.MASTER_ADMIN).length,
      reReg: users.filter(u => u.registrationYear < 2025 && u.role !== Role.MASTER_ADMIN).length,
      pending: users.filter(u => u.status === UserStatus.PENDING && u.role !== Role.MASTER_ADMIN).length,
      approved: users.filter(u => u.status === UserStatus.APPROVED && u.role !== Role.MASTER_ADMIN).length,
      rejected: users.filter(u => u.status === UserStatus.REJECTED && u.role !== Role.MASTER_ADMIN).length,
      paid: users.filter(u => u.paymentStatus === PaymentStatus.PAID && u.role !== Role.MASTER_ADMIN).length,
      admins: users.filter(u => u.role !== Role.USER && u.role !== Role.MASTER_ADMIN).length,
      collected: users.filter(u => u.paymentStatus === PaymentStatus.PAID && u.role !== Role.MASTER_ADMIN).length * 60
  };

  const handleLogin = async (identifier: string, passwordInput: string) => {
      setIsLoading(true);
      
      // Hardcoded fallback for Admin if DB is empty or slow
      if (identifier === 'admin' && passwordInput === 'admin123') {
        const admin = users.find(u => u.email === 'admin');
        if (admin) {
          setCurrentUser(admin);
          setViewMode('ADMIN');
          setCurrentView('DASHBOARD');
          setIsLoading(false);
          return;
        }
      }

      try {
        // Always fetch fresh data on login attempt to ensure synced state
        const freshUsers = await StorageService.getUsers();
        setUsers(freshUsers);
        
        const cleanId = identifier.trim().toLowerCase();
        const user = freshUsers.find(u => 
            (u.email && u.email.toLowerCase() === cleanId) || 
            (u.mobile && u.mobile.trim() === cleanId)
        );
        
        if (user && user.password === passwordInput) {
            setCurrentUser(user);
            
            // Logic for Roles
            if (user.role === Role.MASTER_ADMIN) {
                setViewMode('ADMIN');
            } else if (user.role === Role.USER) {
                setViewMode('USER');
            } else {
                 // Mandalam/Custom Admins default to Admin view but can switch
                 setViewMode('ADMIN');
            }

            if (user.isImported) {
                setIsProfileCompletionOpen(true);
            }
            setCurrentView('DASHBOARD');
        } else {
            alert("Invalid credentials.");
        }
      } catch (e) {
          console.error(e);
          alert("Login error.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegister = async (newUser: User) => {
    setIsLoading(true);
    try {
      await StorageService.addUser(newUser);
      await refreshData();
      
      setCurrentUser(newUser);
      setViewMode('USER');
      setCurrentView('DASHBOARD');
      alert("Registration successful!");
    } catch (e: any) {
      alert(e.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView('AUTH');
      setViewMode('USER');
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
      setIsLoading(true);
      try {
        await StorageService.updateUser(userId, updates);
        await refreshData();
      } catch (error) {
          console.error("Update failed", error);
          alert("Failed to update user.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddBenefit = async (benefit: BenefitRecord) => {
    setIsLoading(true);
    try {
        await StorageService.addBenefit(benefit);
        await refreshData();
    } catch (error) {
        console.error(error);
        alert("Failed to add benefit");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteBenefit = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this record?")) return;
    setIsLoading(true);
    try {
        await StorageService.deleteBenefit(id);
        await refreshData();
    } catch (error) {
        console.error(error);
        alert("Failed to delete benefit");
    } finally {
        setIsLoading(false);
    }
  };

  const submitProfileCompletion = async () => {
      if (!currentUser) return;
      if (!completionForm.email || !completionForm.password) {
          alert("Email and Password are required.");
          return;
      }

      await handleUpdateUser(currentUser.id, {
          email: completionForm.email,
          password: completionForm.password,
          addressUAE: completionForm.addressUAE,
          addressIndia: completionForm.addressIndia,
          nominee: completionForm.nominee,
          relation: completionForm.relation,
          isImported: false 
      });
      
      setIsProfileCompletionOpen(false);
      alert("Profile completed successfully. You can now use these credentials to login.");
  };

  const toggleViewMode = () => {
      if (currentUser?.role === Role.USER || currentUser?.role === Role.MASTER_ADMIN) return; 
      setViewMode(prev => prev === 'ADMIN' ? 'USER' : 'ADMIN');
      setCurrentView('DASHBOARD');
  };

  const renderContent = () => {
    if (isLoading && !currentUser) { // Show loading only on initial load or auth
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="animate-spin text-primary text-4xl mb-4">
                   <i className="fa-solid fa-circle-notch"></i>
                </div>
                <p className="text-slate-500 font-medium">Connecting to Secure Server...</p>
            </div>
        )
    }

    if (!currentUser || currentView === 'AUTH') {
      return <Auth onLogin={handleLogin} onRegister={handleRegister} isLoading={isLoading} />;
    }

    if (viewMode === 'USER') {
        switch (currentView) {
            case 'DASHBOARD': return <UserDashboard user={currentUser} benefits={benefits} onUpdateUser={handleUpdateUser} isLoading={isLoading} />;
            case 'CARD': return <MembershipCard user={currentUser} />;
            case 'BENEFITS': return <UserBenefits user={currentUser} benefits={benefits} />;
            case 'ACCOUNT': return <AccountSettings user={currentUser} onUpdateUser={handleUpdateUser} />;
            case 'NOTIFICATIONS': return <UserNotifications user={currentUser} />;
            default: return <UserDashboard user={currentUser} benefits={benefits} onUpdateUser={handleUpdateUser} isLoading={isLoading} />;
        }
    } else {
        // Admin View
        switch (currentView) {
            case 'DASHBOARD': return (
              <AdminDashboard 
                users={users} 
                benefits={benefits}
                stats={stats} 
                onUpdateUser={handleUpdateUser}
                onAddBenefit={handleAddBenefit}
                onDeleteBenefit={handleDeleteBenefit}
                isLoading={isLoading}
              />
            );
            case 'COMMUNICATIONS': return <Communications />;
            default: return (
              <AdminDashboard 
                users={users} 
                benefits={benefits}
                stats={stats} 
                onUpdateUser={handleUpdateUser}
                onAddBenefit={handleAddBenefit}
                onDeleteBenefit={handleDeleteBenefit}
                isLoading={isLoading}
              />
            );
        }
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      currentUser={currentUser}
      onLogout={handleLogout}
      viewMode={viewMode}
      toggleViewMode={toggleViewMode}
    >
      {renderContent()}

      {/* Loading Overlay for Actions */}
      {isLoading && currentUser && (
          <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-sm flex items-center justify-center">
               <div className="animate-spin text-primary text-3xl">
                   <i className="fa-solid fa-spinner"></i>
                </div>
          </div>
      )}

      {isProfileCompletionOpen && currentUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
                  <div className="text-center border-b border-slate-100 pb-4">
                      <h2 className="text-2xl font-bold text-slate-900">Complete Your Profile</h2>
                      <p className="text-slate-500 text-sm">We need a few more details to secure your account.</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            placeholder="your@email.com"
                            value={completionForm.email}
                            onChange={(e) => setCompletionForm({...completionForm, email: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">New Password</label>
                          <input 
                            type="password" 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.password}
                            onChange={(e) => setCompletionForm({...completionForm, password: e.target.value})}
                          />
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">UAE Address</label>
                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none resize-none h-20 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.addressUAE}
                            onChange={(e) => setCompletionForm({...completionForm, addressUAE: e.target.value})}
                          ></textarea>
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">India Address</label>
                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none resize-none h-20 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.addressIndia}
                            onChange={(e) => setCompletionForm({...completionForm, addressIndia: e.target.value})}
                          ></textarea>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nominee Name</label>
                             <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={completionForm.nominee}
                                onChange={(e) => setCompletionForm({...completionForm, nominee: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Relation</label>
                             <select 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={completionForm.relation}
                                onChange={(e) => setCompletionForm({...completionForm, relation: e.target.value})}
                             >
                                 <option value="Father">Father</option>
                                 <option value="Mother">Mother</option>
                                 <option value="Wife">Wife</option>
                                 <option value="Husband">Husband</option>
                                 <option value="Son">Son</option>
                             </select>
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={submitProfileCompletion}
                    className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
                  >
                      Save Profile
                  </button>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;

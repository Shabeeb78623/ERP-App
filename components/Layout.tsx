import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  IdCard, 
  Menu, 
  LogOut,
  Bell,
  UserCircle,
  HeartHandshake,
  Settings,
  X,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { ViewState, User, Role } from '../types';
import { StorageService } from '../services/storageService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  currentUser: User | null;
  onLogout: () => void;
  viewMode: 'ADMIN' | 'USER';
  toggleViewMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
    children, 
    currentView, 
    setCurrentView, 
    currentUser, 
    onLogout, 
    viewMode, 
    toggleViewMode 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // If not logged in, just render children (Auth pages)
  if (!currentUser) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const handleExportExcel = () => {
    const users = StorageService.getUsers().filter(u => u.role !== Role.MASTER_ADMIN);
    if (users.length === 0) {
        alert("No users to export.");
        return;
    }

    const headers = [
        "Reg No", "Full Name", "Email", "Mobile", "WhatsApp", "Emirates ID", 
        "Mandalam", "Emirate", "Status", "Payment Status", "Year"
    ];

    const csvContent = [
        headers.join(","),
        ...users.map(user => [
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
    link.setAttribute("download", `Member_Data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetApp = () => {
      if (window.confirm("WARNING: This will delete ALL data (users, benefits, notifications) and reset the app to default. Are you sure?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // Navigation Items
  const navItems = viewMode === 'USER'
    ? [
        { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'CARD', label: 'My ID Card', icon: IdCard },
        { id: 'BENEFITS', label: 'Benefits', icon: HeartHandshake },
        { id: 'NOTIFICATIONS', label: 'Inbox', icon: Bell },
        { id: 'ACCOUNT', label: 'Account', icon: Settings },
      ]
    : [
        // Admin navigation is handled inside the dashboard tabs, 
        // but we can add a 'Home' link if needed.
        { id: 'DASHBOARD', label: 'Console', icon: LayoutDashboard },
      ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                 <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    V
                 </div>
                 <h1 className="text-xl font-bold text-primary tracking-tight">
                    Vadakara Forum <span className="text-slate-400 font-normal text-sm ml-2 hidden md:inline-block">| {viewMode === 'USER' ? 'Member Portal' : 'Administration'}</span>
                 </h1>
              </div>
              
              {/* Desktop Nav Links */}
              <nav className="hidden md:ml-10 md:flex md:space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewState)}
                    className={`
                      inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${currentView === item.id 
                        ? 'text-primary bg-blue-50' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                    `}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
               
               {/* Admin Actions */}
               {viewMode === 'ADMIN' && currentUser.role === Role.MASTER_ADMIN && (
                  <button 
                    onClick={handleExportExcel}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                      Export Data
                  </button>
               )}

               {/* Switch View (Only for Non-Master Admins) */}
               {currentUser.role !== Role.USER && currentUser.role !== Role.MASTER_ADMIN && (
                  <button
                      onClick={toggleViewMode}
                      className="text-xs font-semibold text-primary hover:text-blue-800 underline"
                  >
                      {viewMode === 'ADMIN' ? 'User View' : 'Admin Console'}
                  </button>
               )}

               {/* Profile Dropdown */}
               <div className="relative ml-3">
                  <div>
                    <button 
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center gap-2 max-w-xs bg-white rounded-full focus:outline-none" 
                    >
                      {currentUser.photoUrl ? (
                        <img className="h-8 w-8 rounded-full object-cover border border-slate-200" src={currentUser.photoUrl} alt="" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                           <UserCircle className="w-5 h-5" />
                        </div>
                      )}
                      <span className="hidden md:block text-sm font-medium text-slate-700">{currentUser.fullName}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                    </button>
                  </div>
                  
                  {isProfileDropdownOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-sm text-slate-900 font-medium truncate">{currentUser.fullName}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser.email || currentUser.mobile}</p>
                        </div>
                        
                        <button 
                            onClick={handleResetApp}
                            className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Reset Data
                        </button>

                        <button 
                            onClick={() => {
                                onLogout();
                                setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                        >
                            <LogOut className="w-4 h-4" /> Sign out
                        </button>
                    </div>
                  )}
               </div>

               {/* Mobile Menu Button */}
               <div className="-mr-2 flex md:hidden">
                 <button
                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                   className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
                 >
                   {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="pt-2 pb-3 space-y-1 px-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id as ViewState);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    currentView === item.id
                      ? 'bg-blue-50 text-primary'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </div>
                </button>
              ))}
              <button
                  onClick={onLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <div className="flex items-center">
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                  </div>
                </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {children}
      </main>
    </div>
  );
};

export default Layout;
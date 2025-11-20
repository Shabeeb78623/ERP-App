
import React, { useState } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Mandalam, Emirate, Role, UserStatus, PaymentStatus, User } from '../types';
import { StorageService } from '../services/storageService';

interface AuthProps {
  onLogin: (identifier: string, password: string) => void;
  onRegister: (user: User) => void;
  isLoading?: boolean;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, isLoading }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    whatsapp: '',
    emiratesId: '',
    mandalam: Mandalam.BALUSHERI,
    emirate: Emirate.AJMAN,
    addressUAE: '',
    addressIndia: '',
    nominee: '',
    relation: 'Father',
    isKMCCMember: false,
    kmccNo: '',
    isPratheekshaMember: false,
    pratheekshaNo: '',
    recommendedBy: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginIdentifier.trim(), loginPassword.trim());
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const currentYear = new Date().getFullYear();
    const newMembershipNo = await StorageService.generateNextMembershipNo(currentYear);

    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName: formData.fullName,
      email: formData.email,
      mobile: formData.mobile,
      whatsapp: formData.whatsapp,
      emiratesId: formData.emiratesId,
      mandalam: formData.mandalam,
      emirate: formData.emirate,
      addressUAE: formData.addressUAE,
      addressIndia: formData.addressIndia,
      nominee: formData.nominee,
      relation: formData.relation,
      isKMCCMember: formData.isKMCCMember,
      kmccNo: formData.kmccNo,
      isPratheekshaMember: formData.isPratheekshaMember,
      pratheekshaNo: formData.pratheekshaNo,
      recommendedBy: formData.recommendedBy,
      status: UserStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      role: Role.USER,
      registrationYear: currentYear,
      photoUrl: '',
      membershipNo: newMembershipNo,
      registrationDate: new Date().toLocaleDateString(),
      password: formData.password,
      isImported: false
    };

    onRegister(newUser);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  if (isRegistering) {
      return (
          <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
              <div className="bg-white p-8 rounded-md shadow-lg border-t-4 border-primary w-full max-w-3xl space-y-8">
                  <div className="text-center border-b border-slate-100 pb-6">
                      <h2 className="text-3xl font-bold text-primary">Member Registration</h2>
                      <p className="text-slate-500 text-sm mt-1">Join the Vadakara NRI Forum Community</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <input name="fullName" required onChange={handleInputChange} type="text" placeholder="Full Name *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                              <input name="whatsapp" required onChange={handleInputChange} type="text" placeholder="WhatsApp Number *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                              <select name="relation" onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded outline-none bg-white">
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Son">Son</option>
                                  <option value="Daughter">Daughter</option>
                                  <option value="Wife">Wife</option>
                                  <option value="Husband">Husband</option>
                              </select>
                              <select name="mandalam" onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded outline-none bg-white">
                                  {Object.values(Mandalam).map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                          <div className="space-y-4">
                              <input name="mobile" required onChange={handleInputChange} type="text" placeholder="Mobile Number *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                              <input name="nominee" required onChange={handleInputChange} type="text" placeholder="Nominee *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                              <select name="emirate" onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded outline-none bg-white">
                                  {Object.values(Emirate).map(e => <option key={e} value={e}>{e}</option>)}
                              </select>
                              <input name="email" required onChange={handleInputChange} type="email" placeholder="Email Address *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                      </div>

                      <div className="space-y-4">
                           <textarea name="addressUAE" required onChange={handleInputChange} placeholder="Address UAE *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none h-20 resize-none focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
                           <textarea name="addressIndia" required onChange={handleInputChange} placeholder="Address India *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none h-20 resize-none focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer mb-2 text-sm font-medium text-slate-700">
                                <input name="isKMCCMember" onChange={handleCheckboxChange} type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" /> KMCC Member
                            </label>
                            {formData.isKMCCMember && (
                                <input name="kmccNo" onChange={handleInputChange} type="text" placeholder="KMCC Membership No" className="w-full px-4 py-2 border border-slate-300 rounded outline-none" />
                            )}
                          </div>
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer mb-2 text-sm font-medium text-slate-700">
                                <input name="isPratheekshaMember" onChange={handleCheckboxChange} type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" /> Pratheeksha Member
                            </label>
                             {formData.isPratheekshaMember && (
                                <input name="pratheekshaNo" onChange={handleInputChange} type="text" placeholder="Pratheeksha Membership No" className="w-full px-4 py-2 border border-slate-300 rounded outline-none" />
                            )}
                          </div>
                      </div>

                      <input name="recommendedBy" onChange={handleInputChange} type="text" placeholder="Recommended By" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      <input name="emiratesId" required onChange={handleInputChange} type="text" placeholder="Emirates ID (15 digits) *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />

                      <div className="space-y-4">
                          <div className="relative">
                               <input name="password" required onChange={handleInputChange} type="password" placeholder="Password *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                          <div className="relative">
                               <input name="confirmPassword" required onChange={handleInputChange} type="password" placeholder="Confirm Password *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                      </div>

                      <button type="submit" disabled={isLoading} className="w-full py-3 bg-accent text-white font-bold rounded hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50">
                          {isLoading ? 'Creating Account...' : 'Create Account'}
                      </button>

                      <p className="text-center text-sm text-slate-600">
                          Already have an account? <button type="button" onClick={() => setIsRegistering(false)} className="text-primary font-bold hover:underline ml-1">Sign in</button>
                      </p>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary z-0"></div>
      
      <div className="bg-white p-8 rounded-md shadow-xl border border-slate-200 w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary tracking-tight uppercase">Vadakara NRI Forum</h1>
          <p className="text-slate-500 text-sm mt-2">Member Login</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mobile No. or Email</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Enter registered mobile or email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Imported users: Use Emirates ID as password.</p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-accent text-white font-bold rounded hover:bg-accent-hover transition-colors shadow-sm uppercase tracking-wide disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600 border-t border-slate-100 pt-4 flex flex-col gap-4">
          <p>New member? <button onClick={() => setIsRegistering(true)} className="text-primary font-bold hover:underline">Register Now</button></p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

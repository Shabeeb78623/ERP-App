
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Mandalam, Emirate, Role, UserStatus, PaymentStatus, User, RegistrationQuestion, FieldType } from '../types';
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

  // Dynamic Questions State
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  useEffect(() => {
      if(isRegistering) {
          StorageService.getQuestions().then(qs => setQuestions(qs));
      }
  }, [isRegistering]);

  // Registration State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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

    const findAnswer = (labelPart: string) => {
        const q = questions.find(q => q.label.toLowerCase().includes(labelPart));
        return q ? customData[q.id] : '';
    }

    const fullName = findAnswer('name') || 'Unknown';
    const mobile = findAnswer('mobile') || '0000000000';
    const emiratesId = findAnswer('emirates id') || '000000000000000';
    const email = findAnswer('email') || formData.email; 
    const mandalam = (findAnswer('mandalam') as Mandalam) || Mandalam.BALUSSERY;
    const emirate = (findAnswer('emirate') as Emirate) || Emirate.DUBAI;

    const currentYear = new Date().getFullYear();
    const newMembershipNo = await StorageService.generateNextMembershipNo(currentYear);

    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName: fullName,
      email: email,
      mobile: mobile,
      whatsapp: findAnswer('whatsapp') || mobile,
      emiratesId: emiratesId,
      mandalam: mandalam,
      emirate: emirate,
      addressUAE: findAnswer('address uae') || '',
      addressIndia: findAnswer('address india') || '',
      nominee: findAnswer('nominee') || '',
      relation: findAnswer('relation') || '',
      status: UserStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      role: Role.USER,
      registrationYear: currentYear,
      photoUrl: '',
      membershipNo: newMembershipNo,
      registrationDate: new Date().toLocaleDateString(),
      password: formData.password,
      isImported: false,
      customData: customData 
    };

    onRegister(newUser);
  };

  const handleCustomChange = (questionId: string, value: string) => {
      setCustomData(prev => ({ ...prev, [questionId]: value }));
      
      const childQs = questions.filter(q => q.parentQuestionId === questionId);
      if (childQs.length > 0) {
          setCustomData(prev => {
              const newState = {...prev};
              childQs.forEach(child => {
                   newState[child.id] = ''; 
              });
              return newState;
          });
      }
  };

  const renderField = (q: RegistrationQuestion) => {
      const commonClasses = "w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary";
      
      if (q.type === FieldType.TEXT) {
          return <input required={q.required} type="text" placeholder={q.placeholder || q.label} className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      }
      if (q.type === FieldType.NUMBER) {
          return <input required={q.required} type="number" placeholder={q.placeholder || q.label} className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      }
      if (q.type === FieldType.TEXTAREA) {
          return <textarea required={q.required} placeholder={q.placeholder || q.label} className={`${commonClasses} h-20 resize-none`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      }
      if (q.type === FieldType.DROPDOWN) {
          return (
              <select required={q.required} className={`${commonClasses} bg-white`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)}>
                  <option value="">Select {q.label}...</option>
                  {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          );
      }
      if (q.type === FieldType.DEPENDENT_DROPDOWN) {
          const parentVal = customData[q.parentQuestionId || ''];
          const availableOptions = parentVal ? (q.dependentOptions?.[parentVal] || []) : [];
          
          return (
              <select required={q.required} disabled={!parentVal} className={`${commonClasses} bg-white disabled:bg-slate-100`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)}>
                  <option value="">{parentVal ? `Select ${q.label}...` : `Select ${questions.find(p => p.id === q.parentQuestionId)?.label} first`}</option>
                  {availableOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          );
      }
      return null;
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
                      
                      {questions.length === 0 && (
                          <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-xl">
                              Admin has not configured registration questions yet. <br/>
                              Please contact support.
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Dynamically Render Questions */}
                           {questions.map(q => (
                               <div key={q.id} className={q.type === FieldType.TEXTAREA ? "md:col-span-2" : ""}>
                                   <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">{q.label} {q.required && '*'}</label>
                                   {renderField(q)}
                               </div>
                           ))}
                      </div>
                      
                      {/* Core Password Fields (Always Required) */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                          <h3 className="text-sm font-bold text-slate-900">Security</h3>
                           {/* Fallback Email if not in questions */}
                          {!questions.some(q => q.label.toLowerCase().includes('email')) && (
                              <input required type="email" placeholder="Email Address *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <input required type="password" placeholder="Password *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                              <input required type="password" placeholder="Confirm Password *" className="w-full px-4 py-2 border border-slate-300 rounded outline-none" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                          </div>
                      </div>

                      <button type="submit" disabled={isLoading || questions.length === 0} className="w-full py-3 bg-accent text-white font-bold rounded hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50">
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

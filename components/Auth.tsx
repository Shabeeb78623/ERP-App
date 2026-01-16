
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
      if(isRegistering) {
          StorageService.getQuestions().then(qs => setQuestions(qs));
      }
  }, [isRegistering]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginIdentifier.trim(), loginPassword.trim());
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-map fields based on systemMapping
    let newUser: Partial<User> = {
        customData: {},
        status: UserStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        role: Role.USER,
        photoUrl: photoPreview || '',
        isImported: false
    };
    
    const currentYear = new Date().getFullYear();
    newUser.registrationYear = currentYear;
    // Note: membershipNo is generated securely in StorageService.addUser now
    newUser.registrationDate = new Date().toLocaleDateString();
    newUser.id = `user-${Date.now()}`;

    // Loop through all questions to build User object
    for (const q of questions) {
        if (!shouldShowQuestion(q)) continue;
        
        const value = customData[q.id];
        
        // Validation check for Required fields
        if (q.required && !value && q.type !== FieldType.FILE) {
            alert(`Please fill the required field: ${q.label}`);
            return;
        }

        if (q.systemMapping && q.systemMapping !== 'NONE') {
            (newUser as any)[q.systemMapping] = value;
            if (q.systemMapping.startsWith('is')) {
                 (newUser as any)[q.systemMapping] = value === 'Yes' || value === 'YES';
            }
        } else {
            if (newUser.customData) newUser.customData[q.id] = value;
        }
    }

    if (!newUser.mandalam) newUser.mandalam = Mandalam.VATAKARA;
    if (!newUser.emirate) newUser.emirate = Emirate.DUBAI;
    if (!newUser.mobile) newUser.mobile = '0000000000';
    if (!newUser.emiratesId) newUser.emiratesId = `784${Date.now()}`;
    
    if (!newUser.password) {
        alert("Password field is missing in configuration. Please contact admin.");
        return;
    }

    // Direct Register without OTP
    onRegister(newUser as User);
  };

  const handleCustomChange = (questionId: string, value: string) => {
      setCustomData(prev => ({ ...prev, [questionId]: value }));
      
      const childQs = questions.filter(q => q.parentQuestionId === questionId);
      if (childQs.length > 0) {
          setCustomData(prev => {
              const newState = {...prev};
              childQs.forEach(child => { newState[child.id] = ''; });
              return newState;
          });
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { 
              alert("File size exceeds 1MB");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              setPhotoPreview(base64);
              handleCustomChange(questionId, "File Uploaded");
          };
          reader.readAsDataURL(file);
      }
  };

  const shouldShowQuestion = (q: RegistrationQuestion) => {
      if (!q.parentQuestionId) return true;
      const parentValue = customData[q.parentQuestionId];
      if (!parentValue) return false;
      if (q.dependentOptions) {
          const allowedParentValues = Object.keys(q.dependentOptions);
          if (allowedParentValues.length > 0 && !allowedParentValues.includes(parentValue)) {
              return false;
          }
      }
      return true;
  };

  const renderField = (q: RegistrationQuestion) => {
      const commonClasses = "w-full px-4 py-2 border border-slate-300 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary";
      
      if (q.type === FieldType.TEXT) return <input required={q.required} type="text" placeholder={q.placeholder || q.label} className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      if (q.type === FieldType.PASSWORD) return <input required={q.required} type="password" placeholder={q.placeholder || q.label} className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      if (q.type === FieldType.NUMBER) return <input required={q.required} type="number" placeholder={q.placeholder || q.label} className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      if (q.type === FieldType.DATE) return <input required={q.required} type="date" className={commonClasses} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      if (q.type === FieldType.FILE) return (<div><input required={q.required} type="file" accept="image/*,application/pdf" className={commonClasses} onChange={e => handleFileUpload(e, q.id)} /><p className="text-[10px] text-slate-500 mt-1">{q.placeholder}</p></div>);
      if (q.type === FieldType.TEXTAREA) return <textarea required={q.required} placeholder={q.placeholder || q.label} className={`${commonClasses} h-20 resize-none`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)} />;
      if (q.type === FieldType.DROPDOWN) return (<select required={q.required} className={`${commonClasses} bg-white`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)}><option value="">Select {q.label}...</option>{q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
      if (q.type === FieldType.DEPENDENT_DROPDOWN) {
          const parentVal = customData[q.parentQuestionId || ''];
          const availableOptions = parentVal ? (q.dependentOptions?.[parentVal] || []) : [];
          return (<select required={q.required} disabled={!parentVal} className={`${commonClasses} bg-white disabled:bg-slate-100`} value={customData[q.id] || ''} onChange={e => handleCustomChange(q.id, e.target.value)}><option value="">{parentVal ? `Select ${q.label}...` : `Select ${questions.find(p => p.id === q.parentQuestionId)?.label} first`}</option>{availableOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
      }
      return null;
  };

  if (isRegistering) {
      return (
          <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
              <div className="bg-white p-8 rounded-md shadow-lg border-t-4 border-primary w-full max-w-3xl space-y-8">
                  <div className="text-center border-b border-slate-100 pb-6 relative">
                      <button onClick={() => setIsRegistering(false)} className="absolute left-0 top-0 p-2 text-slate-400 hover:text-slate-600"><ArrowLeft className="w-6 h-6"/></button>
                      <h2 className="text-3xl font-bold text-primary">Member Registration</h2>
                      <p className="text-slate-500 text-sm mt-1">Join the Vadakara NRI Forum Community</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                      {questions.length === 0 && <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-xl">Loading form...</div>}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {questions.map(q => {
                               if (!shouldShowQuestion(q)) return null;
                               return (
                                   <div key={q.id} className={q.type === FieldType.TEXTAREA ? "md:col-span-2" : ""}>
                                       <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">{q.label} {q.required && '*'}</label>
                                       {renderField(q)}
                                   </div>
                               );
                           })}
                      </div>

                      <button type="submit" disabled={isLoading || questions.length === 0} className="w-full py-3 bg-accent text-white font-bold rounded hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50">
                          {isLoading ? 'Processing...' : 'Register'}
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // ... Login UI ...
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

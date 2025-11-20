import React, { useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import { User, UserStatus } from '../types';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface MembershipCardProps {
  user: User;
}

const MembershipCard: React.FC<MembershipCardProps> = ({ user }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.membershipNo}`;

  const handleDownload = async () => {
    if (cardRef.current && window.html2canvas) {
      try {
        const canvas = await window.html2canvas(cardRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `MemberCard-${user.membershipNo}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error("Error generating card image", error);
        alert("Could not generate card image. Please try again.");
      }
    } else {
        alert("Download library not loaded yet.");
    }
  };

  if (user.status !== UserStatus.APPROVED) {
      return (
          <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Card Locked</h3>
              <p className="text-slate-500 mt-2">Your membership card will be available once your account is approved.</p>
          </div>
      )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Digital Membership Card</h2>
          <p className="text-slate-500">Official identification for Vadakara NRI Forum events.</p>
      </div>

      <div className="flex justify-center p-4">
        <div 
            id="membership-card" 
            ref={cardRef}
            className="w-full max-w-[600px] aspect-[1.8/1] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row bg-white"
        >
            {/* Left Side - Brand Green */}
            <div className="md:w-[40%] bg-emerald-700 p-8 text-white flex flex-col justify-between relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                
                <div className="relative z-10">
                    <div className="opacity-80 text-[10px] font-bold tracking-widest mb-1">REGISTRATION NO</div>
                    <div className="text-2xl font-mono font-bold tracking-tight">{user.membershipNo}</div>
                </div>
                
                <div className="relative z-10">
                    <h2 className="text-xl font-bold leading-tight mb-4">{user.fullName}</h2>
                    <div className="space-y-1 text-xs opacity-90 font-medium">
                        <p>{user.mobile}</p>
                        <p>{user.mandalam}</p>
                        <p>{user.emirate}</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Brand Blue */}
            <div className="md:w-[60%] bg-blue-800 p-8 text-white relative flex flex-col items-center justify-center text-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
                 
                <div className="mb-4 font-bold text-sm tracking-widest opacity-90 uppercase">
                    Pratheeksha
                </div>

                <div className="bg-white p-3 rounded-xl shadow-lg mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain mix-blend-multiply" crossOrigin="anonymous" />
                </div>

                <div className="text-[10px] opacity-60 uppercase tracking-widest">
                    Valid Thru {user.registrationYear}
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-center">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
              <Download className="w-5 h-5" /> Save to Device
          </button>
      </div>
    </div>
  );
};

export default MembershipCard;
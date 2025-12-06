
import React, { useRef, useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { User, UserStatus, CardConfig } from '../types';
import { StorageService } from '../services/storageService';

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
  const [cardConfig, setCardConfig] = useState<CardConfig | null>(null);

  useEffect(() => {
      StorageService.getCardConfig().then(c => setCardConfig(c));
  }, []);

  const handleDownload = async () => {
    if (cardRef.current && window.html2canvas) {
      try {
        const canvas = await window.html2canvas(cardRef.current, {
            scale: 3, // Higher resolution
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

  // --- RENDER CUSTOM TEMPLATE IF AVAILABLE ---
  if (cardConfig && cardConfig.templateImage) {
      return (
        <div className="max-w-3xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">Digital Membership Card</h2>
                <p className="text-slate-500">Official identification for Vadakara NRI Forum.</p>
            </div>

            <div className="flex justify-center p-4">
                <div 
                    ref={cardRef}
                    className="relative shadow-2xl rounded-xl overflow-hidden inline-block"
                >
                    <img src={cardConfig.templateImage} alt="Card Template" className="max-w-full h-auto block" />
                    
                    {/* Render Fields */}
                    {cardConfig.fields.map(field => {
                        // Resolve Value Logic
                        let value = '';
                        
                        // 1. Try direct User property (System Field)
                        if (field.key in user) {
                            value = String((user as any)[field.key] || '');
                        } 
                        // 2. Try Custom Data (Question ID)
                        else if (user.customData && user.customData[field.key]) {
                             value = String(user.customData[field.key]);
                        }
                        
                        // 3. Fallbacks / Formatting
                        if (!value) value = '';
                        
                        return (
                            <div 
                                key={field.id}
                                style={{
                                    position: 'absolute',
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    color: field.color,
                                    fontSize: `${field.fontSize}px`, 
                                    fontWeight: field.fontWeight,
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1,
                                    zIndex: 10
                                }}
                            >
                                {value}
                            </div>
                        )
                    })}
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
  }

  return (
      <div className="text-center py-10">
          <p className="text-slate-500">No card template configured by Admin.</p>
      </div>
  );
};

export default MembershipCard;

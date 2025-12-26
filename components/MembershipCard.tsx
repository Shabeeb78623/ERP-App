
import React, { useRef, useEffect, useState } from 'react';
import { Download, Share2, Lock, QrCode } from 'lucide-react';
import { User, UserStatus, CardConfig, PaymentStatus, CardSideConfig, CardField } from '../types';
import { StorageService } from '../services/storageService';
import QRCode from 'qrcode';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface MembershipCardProps {
  user: User;
}

const MembershipCard: React.FC<MembershipCardProps> = ({ user }) => {
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const [cardConfig, setCardConfig] = useState<CardConfig | null>(null);

  useEffect(() => {
      StorageService.getCardConfig().then(c => setCardConfig(c));
  }, []);

  const handleDownload = async (side: 'front' | 'back') => {
    const ref = side === 'front' ? frontCardRef : backCardRef;
    if (ref.current && window.html2canvas) {
      try {
        const canvas = await window.html2canvas(ref.current, {
            scale: 3, // Higher resolution
            useCORS: true,
            backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `MemberCard_${side}_${user.membershipNo}.png`;
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

  // Check if User is Approved AND Payment is Paid
  if (user.status !== UserStatus.APPROVED || user.paymentStatus !== PaymentStatus.PAID) {
      return (
          <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Card Unavailable</h3>
              <p className="text-slate-500 mt-2">
                  {user.paymentStatus !== PaymentStatus.PAID 
                      ? "Your membership payment must be approved to access your ID card."
                      : "Your account is pending approval."}
              </p>
          </div>
      )
  }

  // Helper to render a card side
  const renderCardSide = (sideConfig: CardSideConfig, ref: React.RefObject<HTMLDivElement>, sideName: string) => {
      if (!sideConfig.templateImage) return null;

      return (
        <div className="flex flex-col items-center gap-4">
             <div 
                ref={ref as any} // Cast to any to avoid type complaints with null initialized refs
                className="relative shadow-2xl rounded-xl overflow-hidden inline-block"
            >
                <img src={sideConfig.templateImage} alt={`${sideName} Template`} className="max-w-full h-auto block" />
                
                {/* Render Fields */}
                {sideConfig.fields.map(field => {
                    // QR Code Special Handling
                    if (field.type === 'QR') {
                        // Generate QR Data URL
                        const verifyUrl = `${window.location.origin}?verify=${user.id}`;
                        // We use a React Effect style logic inside mapping or just use sync version if possible.
                        // QRCode.toDataURL is async usually. 
                        // To keep it simple in render, we can use a canvas or sync generation if library supports, 
                        // BUT standard lib is async.
                        // For simplicity in this component, let's use an <img> with a data URI generated via a component wrapper
                        // Or just render a QR component.
                        
                        return (
                             <div
                                key={field.id}
                                style={{
                                    position: 'absolute',
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 10
                                }}
                            >
                                <QRCodeImage text={verifyUrl} width={64} />
                            </div>
                        );
                    }

                    // Text Field Logic
                    let value = '';
                    if (field.key in user) {
                        value = String((user as any)[field.key] || '');
                    } else if (user.customData && user.customData[field.key]) {
                            value = String(user.customData[field.key]);
                    }
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
            <button 
                onClick={() => handleDownload(sideName as 'front'|'back')}
                className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all shadow-sm text-sm"
            >
                <Download className="w-4 h-4" /> Download {sideName === 'front' ? 'Front' : 'Back'}
            </button>
        </div>
      );
  };

  if (cardConfig && (cardConfig.front?.templateImage || cardConfig.back?.templateImage)) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">Digital Membership Card</h2>
                <p className="text-slate-500">Official identification for Vadakara NRI Forum.</p>
            </div>

            <div className="flex flex-col xl:flex-row justify-center items-center gap-8 p-4">
                {renderCardSide(cardConfig.front, frontCardRef, 'front')}
                {renderCardSide(cardConfig.back, backCardRef, 'back')}
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

// Internal component to handle async QR generation safely
const QRCodeImage = ({ text, width }: { text: string, width: number }) => {
    const [src, setSrc] = useState('');
    
    useEffect(() => {
        QRCode.toDataURL(text, { width: width * 3, margin: 1 }, (err, url) => {
            if (!err) setSrc(url);
        });
    }, [text]);

    if (!src) return <div className="w-16 h-16 bg-white" />;
    return <img src={src} alt="QR Code" style={{ width: `${width}px`, height: `${width}px` }} />;
}

export default MembershipCard;

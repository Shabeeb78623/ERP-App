import React, { useState } from 'react';
import { Send, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { MANDALAMS } from '../constants';
import { generateCommunicationDraft } from '../services/geminiService';

const Communications: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('All Members');
  const [tone, setTone] = useState('Professional');
  const [messageBody, setMessageBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateAI = async () => {
    if (!topic) {
        setError("Please enter a topic first.");
        return;
    }
    setError('');
    setIsGenerating(true);
    const draft = await generateCommunicationDraft(topic, tone, audience);
    setMessageBody(draft);
    setIsGenerating(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Communications Center</h2>
        <p className="text-slate-500">Create and send official broadcasts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Configuration */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-5">
             <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Settings</h3>
             
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-2">TARGET AUDIENCE</label>
               <select 
                 className="w-full p-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                 value={audience}
                 onChange={(e) => setAudience(e.target.value)}
               >
                 <option>All Members</option>
                 <option>Payment Pending</option>
                 {MANDALAMS.map(m => <option key={m} value={m}>{m} Members</option>)}
               </select>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 mb-3">CHANNELS</label>
               <div className="space-y-3">
                 <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                   <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" defaultChecked /> 
                   <span className="text-sm font-medium text-slate-700">Email Blast</span>
                 </label>
                 <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                   <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" /> 
                   <span className="text-sm font-medium text-slate-700">In-App Notification</span>
                 </label>
               </div>
             </div>
           </div>

           {/* AI Assistant Panel */}
           <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 space-y-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Sparkles className="w-12 h-12 text-primary" />
             </div>
             
             <div className="flex items-center gap-2 text-primary mb-2 relative z-10">
               <Sparkles className="w-5 h-5" />
               <h3 className="font-bold text-sm">AI Writer</h3>
             </div>
             
             <div className="relative z-10 space-y-3">
               <input 
                 type="text" 
                 placeholder="Topic (e.g. Annual Meeting)" 
                 className="w-full p-3 rounded-lg border border-blue-100 text-sm outline-none focus:border-primary"
                 value={topic}
                 onChange={(e) => setTopic(e.target.value)}
               />

                <select 
                  className="w-full p-3 rounded-lg border border-blue-100 text-sm outline-none focus:border-primary bg-white"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                    <option>Professional</option>
                    <option>Urgent</option>
                    <option>Friendly</option>
                </select>

                 {error && (
                     <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>
                 )}

                 <button 
                   onClick={handleGenerateAI}
                   disabled={isGenerating}
                   className="w-full py-2.5 bg-white text-primary border border-blue-200 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm"
                 >
                   {isGenerating ? 'Writing...' : 'Generate Draft'}
                 </button>
             </div>
           </div>
        </div>

        {/* Right: Message Editor */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px]">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Content Editor</h3>
          
          <textarea 
            className="flex-1 w-full p-6 rounded-xl bg-slate-50 border-0 text-slate-700 leading-relaxed outline-none focus:ring-2 focus:ring-primary/10 resize-none"
            placeholder="Write your message here..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          ></textarea>

          <div className="mt-6 flex justify-end gap-3">
            <button className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors">
              Save Draft
            </button>
            <button className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">
              <Send className="w-4 h-4" /> Send Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communications;
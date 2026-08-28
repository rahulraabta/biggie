'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { Bot, Send, User, Sparkles, X, Lightbulb, Globe, Info, Compass, FileText } from 'lucide-react';

interface QAPanelProps {
  activeOpportunity: OpportunityResponseItem | null;
  onClearActiveOpportunity: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  contextTitle?: string;
}

const STRATEGIC_PROMPTS = [
  'Pressure-test the assumptions',
  'Draft a 90-day field test',
  'Identify early customers',
  'Map execution risks',
];

export const QAPanel: React.FC<QAPanelProps> = ({
  activeOpportunity,
  onClearActiveOpportunity,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Welcome to the Analyst Desk. Select any market, cluster, or opportunity card on the radar to interrogate risk models and draft field execution plans.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Support Escape key to close mobile Analyst Desk drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextTitle: activeOpportunity?.title,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsSending(true);

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          activeOpportunityContext: activeOpportunity || undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.answer) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Failed to fetch AI response');
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Sorry, I encountered an issue analyzing your query: ${err.message}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`w-96 bg-[#080d1a] border-l border-slate-800/90 flex flex-col h-full shadow-2xl ${
        isOpenMobile ? 'block fixed inset-y-0 right-0 z-50 pt-16 shadow-2xl w-full max-w-sm' : 'hidden lg:flex'
      }`}
    >
      {/* Analyst Desk Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0e1726]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-950/80 border border-orange-800/80 flex items-center justify-center text-orange-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono-technical font-bold text-orange-500 uppercase tracking-widest flex items-center">
              ANALYST DESK
            </h3>
            <span className="text-[10px] font-sans-technical text-slate-400">Interrogate Signal Models</span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200"
            aria-label="Close Analyst Desk Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Opportunity Context Banner */}
      {activeOpportunity ? (
        <div className="bg-orange-950/30 border-b border-orange-900/50 p-3 flex items-start justify-between">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1.5 mb-1 font-mono-technical">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-600/30 text-orange-300 border border-orange-500/40">
                PINNED CONTEXT
              </span>
              <span className="text-[10px] font-bold text-emerald-400">
                {activeOpportunity.probability_score}% Viability
              </span>
            </div>
            <p className="text-xs font-sans-technical font-bold text-slate-200 line-clamp-1">{activeOpportunity.title}</p>
          </div>
          <button
            onClick={onClearActiveOpportunity}
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Clear active context"
            aria-label="Clear active context"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-[#050811] border-b border-slate-800/60 p-2.5 px-3 text-[11px] font-mono-technical text-slate-400 flex items-center justify-between">
          <span className="flex items-center">
            <Globe className="w-3 h-3 mr-1.5 text-orange-400" /> Worldwide Signal Mode
          </span>
          <span className="text-[10px] text-slate-500 italic">Pin a dossier for context</span>
        </div>
      )}

      {/* Offline Mode Notice */}
      <div className="bg-[#050811] border-b border-slate-800/80 px-3 py-1.5 text-[10px] font-mono-technical text-slate-400 flex items-center justify-between">
        <span className="flex items-center text-amber-400 font-semibold">
          <Info className="w-3 h-3 mr-1 text-amber-400 shrink-0" />
          Offline Preview: Deterministic Local Fallback
        </span>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans-technical">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center mb-1 space-x-1.5 text-[10px] font-mono-technical text-slate-500">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-orange-400" />
                </>
              ) : (
                <>
                  <Compass className="w-3 h-3 text-orange-400" />
                  <span className="font-bold text-orange-400">Analyst Desk</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-xl max-w-[92%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-orange-600 text-white rounded-br-none shadow-md font-medium'
                  : 'bg-[#090e1c] text-slate-200 border border-slate-800 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.contextTitle && (
                <div className="text-[10px] font-mono-technical text-orange-300 font-bold mb-1 pb-1 border-b border-orange-500/30">
                  Regarding: {msg.contextTitle}
                </div>
              )}
              <div className="whitespace-pre-line">{msg.text}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2 font-mono-technical">
            <Compass className="w-4 h-4 text-orange-400 animate-spin" />
            <span className="animate-pulse">Interrogating market signals & probability model...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Strategic Queries */}
      <div className="p-3 border-t border-slate-800/80 bg-[#050811]">
        <span className="text-[10px] font-mono-technical font-bold uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center">
          <Lightbulb className="w-3 h-3 mr-1 text-amber-400" /> Strategic Query Directives
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STRATEGIC_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(promptText)}
              disabled={isSending}
              className="text-[11px] font-sans-technical px-2.5 py-1 rounded-lg bg-[#090e1c] hover:bg-[#0e162b] text-slate-300 border border-slate-800 transition-colors text-left disabled:opacity-50"
              aria-label={`Ask strategic prompt: ${promptText}`}
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-[#080d1a]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              activeOpportunity
                ? `Interrogate ${activeOpportunity.title.slice(0, 20)}...`
                : 'Interrogate market trends, feasibility, CapEx...'
            }
            disabled={isSending}
            className="flex-1 bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs font-sans-technical text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50 focus-ring-custom"
            aria-label="Ask Analyst Desk"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isSending}
            className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 transition-colors shadow-md"
            aria-label="Send Directive"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

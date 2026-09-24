'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { Send, User, Sparkles, X, Lightbulb, Compass, Zap, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QAPanelProps {
  activeOpportunity: OpportunityResponseItem | null;
  onClearActiveOpportunity: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  contextTitle?: string;
  mood?: 'happy' | 'thinking' | 'insight';
}

const CHARACTER_PROMPTS = [
  '⚡ Fast-track 90-day GTM plan',
  '🛡️ Audit execution risks',
  '💰 Estimate CapEx & unit economics',
  '🔎 Identify target off-takers',
];

export const QAPanel: React.FC<QAPanelProps> = ({
  activeOpportunity,
  onClearActiveOpportunity,
  isOpenMobile = false,
  onCloseMobile,
  isDocked = false,
  onToggleDock,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-scout',
      sender: 'ai',
      text: "Hey there! I'm Radar Scout 🧭, your strategic venture assistant! Pick any market node or dossier on the map, and let's pressure-test risks, estimate unit economics, and build winning field plans together!",
      timestamp: 'Just now',
      mood: 'happy',
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
          mood: 'insight',
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Failed to fetch AI response');
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Oops! I hit a quick hiccup analyzing your query: ${err.message}. Give it another shot!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`glass-chrome border-l border-white/10 flex flex-col h-full shadow-md relative z-20 ${
        isOpenMobile
          ? 'block fixed inset-y-0 right-0 z-50 pt-16 shadow-2xl w-full max-w-sm'
          : isDocked
          ? 'w-14 items-center'
          : 'w-full'
      }`}
    >
      {/* Character Assistant Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {/* Scout Character Avatar */}
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 border border-emerald-300/60 flex items-center justify-center text-slate-950 shadow-[0_0_18px_-2px_rgba(16,185,129,0.55)] relative"
          >
            <Compass className="w-5 h-5 text-slate-950 animate-spin" style={{ animationDuration: '14s' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border-2 border-slate-950 animate-ping" />
          </motion.div>

          {!isDocked && (
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center font-mono">
                  RADAR SCOUT 🧭
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40">
                  AI
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-300 block">Your Venture Field Guide</span>
            </div>
          )}
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-100 transition-colors"
            aria-label="Close Scout Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!isDocked && (
        <>
          {/* Active Opportunity Context Banner */}
          {activeOpportunity ? (
            <div className="bg-emerald-500/10 border-b border-emerald-500/30 p-3 flex items-start justify-between">
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-1.5 mb-1 font-mono">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500 text-slate-950 flex items-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    <Sparkles className="w-3 h-3 mr-1 text-slate-950 animate-pulse" />
                    PINNED DOSSIER
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300">
                    {activeOpportunity.probability_score}% Viability
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-100 line-clamp-1">{activeOpportunity.title}</p>
              </div>
              <button
                onClick={onClearActiveOpportunity}
                className="text-slate-500 hover:text-slate-100 p-1 transition-colors"
                title="Clear active context"
                aria-label="Clear active context"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border-b border-white/10 p-2.5 px-3 text-[11px] font-mono text-slate-400 flex items-center justify-between font-medium">
              <span className="flex items-center">
                <Compass className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Worldwide Signal Mode
              </span>
              <span className="text-[10px] text-emerald-300 font-bold">Pin dossier for context</span>
            </div>
          )}

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs font-medium">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center mb-1 space-x-1 text-[10px] font-mono text-slate-500">
                  {msg.sender === 'user' ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3 text-emerald-400" />
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3 text-emerald-400" />
                      <span className="font-bold text-emerald-300">Radar Scout</span>
                    </>
                  )}
                  <span suppressHydrationWarning>• {msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[95%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500 text-slate-950 rounded-br-none font-bold shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)]'
                      : 'bg-white/5 text-slate-200 ring-1 ring-white/10 backdrop-blur-md rounded-bl-none'
                  }`}
                >
                  {msg.contextTitle && (
                    <div className="text-[10px] font-mono text-emerald-300 font-bold mb-1 pb-1 border-b border-white/10">
                      Regarding: {msg.contextTitle}
                    </div>
                  )}
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center space-x-2 text-emerald-300 text-xs py-2 font-mono font-bold">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="animate-pulse">Scout is calculating market & venture telemetry...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Swiggy/Zomato Style Quick Action Prompts */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center">
              <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-400" /> Scout Directives
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CHARACTER_PROMPTS.map((promptText, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend(promptText)}
                  disabled={isSending}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/15 text-emerald-200 ring-1 ring-white/10 hover:ring-emerald-500/40 transition-all duration-300 text-left disabled:opacity-50"
                  aria-label={`Ask strategic prompt: ${promptText}`}
                >
                  {promptText}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-white/10 bg-black/40">
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
                    ? `Ask Scout about ${activeOpportunity.title.slice(0, 18)}...`
                    : 'Ask Scout about CapEx, GTM, risk...'
                }
                disabled={isSending}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25 transition-all duration-300 backdrop-blur-md disabled:opacity-50"
                aria-label="Ask Radar Scout AI"
              />
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                type="submit"
                disabled={!inputQuery.trim() || isSending}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-all shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)]"
                aria-label="Send Directive to Scout"
              >
                <Send className="w-4 h-4 text-slate-950" />
              </motion.button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

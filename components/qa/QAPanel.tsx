'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { Bot, Send, User, Sparkles, X, Lightbulb, AlertTriangle, ShieldCheck, CornerDownLeft, Globe } from 'lucide-react';

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

const QUICK_PROMPTS = [
  'Analyze key execution risks',
  'Suggest GTM & market entry strategy',
  'Estimate CapEx & capital required',
  'Identify regulatory & policy hurdles',
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
      text: 'Hello! I am your AI Opportunity Intelligence Assistant. Select any opportunity card on the radar or ask a market strategic question below.',
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
      className={`w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[calc(100vh-61px)] ${
        isOpenMobile ? 'block fixed inset-y-0 right-0 z-50 pt-16 shadow-2xl w-full max-w-sm' : 'hidden lg:flex'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center">
              AI Market Co-Pilot <Sparkles className="w-3 h-3 text-amber-400 ml-1" />
            </h3>
            <span className="text-[10px] text-slate-400">Contextual Strategy & Due Diligence</span>
          </div>
        </div>

        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Opportunity Context Banner */}
      {activeOpportunity ? (
        <div className="bg-sky-950/30 border-b border-sky-800/40 p-3 flex items-start justify-between">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                ACTIVE CONTEXT
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">
                {activeOpportunity.probability_score}% Viability
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200 line-clamp-1">{activeOpportunity.title}</p>
          </div>
          <button
            onClick={onClearActiveOpportunity}
            className="text-slate-400 hover:text-slate-200 p-1"
            title="Clear active context"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-950/40 border-b border-slate-800/60 p-2.5 px-3 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center">
            <Globe className="w-3 h-3 mr-1 text-slate-500" /> Global Market Context Mode
          </span>
          <span className="text-[10px] text-slate-500 italic">Click card to pin context</span>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center mb-1 space-x-1.5 text-[10px] text-slate-500">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-sky-400" />
                  <span className="font-semibold text-slate-400">AI Co-Pilot</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[90%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none shadow-md shadow-sky-600/10'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
              }`}
            >
              {msg.contextTitle && (
                <div className="text-[10px] text-sky-200 font-semibold mb-1 pb-1 border-b border-sky-500/30">
                  Regarding: {msg.contextTitle}
                </div>
              )}
              <div className="whitespace-pre-line">{msg.text}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <Bot className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="animate-pulse">Analyzing market signals & probability model...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Action Prompts */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center">
          <Lightbulb className="w-3 h-3 mr-1 text-amber-400" /> Suggested Strategic Queries
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(promptText)}
              disabled={isSending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 transition-colors text-left disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
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
                ? `Ask AI about ${activeOpportunity.title.slice(0, 25)}...`
                : 'Ask about market trends, feasibility, CapEx...'
            }
            disabled={isSending}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isSending}
            className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors shadow-md shadow-sky-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

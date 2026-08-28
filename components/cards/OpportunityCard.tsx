'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { ShieldAlert, TrendingUp, Zap, Clock, ExternalLink, Globe, FileText, ArrowRight } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';

interface OpportunityCardProps {
  opportunity: OpportunityResponseItem;
  isSelected?: boolean;
  onSelect: (opportunity: OpportunityResponseItem) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected = false,
  onSelect,
}) => {
  const bandMeta = getBandMetadata(opportunity.band);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'innovation':
        return <Zap className="w-3.5 h-3.5 mr-1 text-purple-400" />;
      case 'investment':
        return <TrendingUp className="w-3.5 h-3.5 mr-1 text-orange-400" />;
      case 'business':
      default:
        return <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, scale: 1.015 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelect(opportunity)}
      className={`group relative cursor-pointer rounded-xl border ${
        isSelected
          ? 'bg-[#0e162b] border-orange-500 ring-1 ring-orange-500 shadow-xl'
          : 'bg-[#090e1c]/90 hover:bg-[#0e162b] border-slate-800/80 hover:border-orange-500/60'
      } backdrop-blur-md p-5 transition-all duration-200 shadow-lg flex flex-col justify-between`}
    >
      {/* Top Copper Accent Stripe for High/Selected Dossiers */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-500" />

      <div>
        {/* Header Info */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center flex-wrap gap-1.5 font-mono-technical">
            {/* Dossier Code Tag */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#050811] text-orange-400 border border-slate-800">
              <FileText className="w-3 h-3 mr-1" /> DOSSIER
            </span>

            {/* Type Badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#050811] text-slate-300 border border-slate-800 uppercase">
              {getTypeIcon(opportunity.type)}
              {opportunity.type}
            </span>

            {/* Sector Tag */}
            {opportunity.dominant_sector && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#050811] text-slate-400 border border-slate-800/80 uppercase">
                {opportunity.dominant_sector}
              </span>
            )}
          </div>

          {/* Viability Band Badge */}
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono-technical font-bold border shrink-0 ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
            {opportunity.probability_score}% • {bandMeta.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-serif-display font-normal text-slate-100 group-hover:text-orange-400 transition-colors line-clamp-2 mb-2 leading-snug">
          {opportunity.title}
        </h3>

        {/* Executive Summary */}
        <p className="text-xs font-sans-technical text-slate-300 line-clamp-2 mb-4 leading-relaxed">
          {opportunity.short_description}
        </p>
      </div>

      <div>
        {/* Component Scores Progress Bars */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80 mb-3 text-[10px] font-mono-technical">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Feasibility</span>
              <span className="font-bold text-slate-200">{opportunity.feasibility_score}%</span>
            </div>
            <div className="w-full bg-[#050811] rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${opportunity.feasibility_score}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Impact</span>
              <span className="font-bold text-slate-200">{opportunity.impact_score}%</span>
            </div>
            <div className="w-full bg-[#050811] rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${opportunity.impact_score}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Time-to-Market</span>
              <span className="font-bold text-slate-200">{opportunity.time_to_market_score}%</span>
            </div>
            <div className="w-full bg-[#050811] rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-purple-400"
                style={{ width: `${opportunity.time_to_market_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-[11px] font-mono-technical text-slate-400 pt-2 border-t border-slate-800/60">
          <span className="inline-flex items-center text-slate-400">
            <Clock className="w-3 h-3 mr-1 text-slate-500" />
            {opportunity.source_count} signal{opportunity.source_count !== 1 ? 's' : ''}
          </span>
          <span className="group-hover:text-orange-400 font-bold inline-flex items-center transition-colors">
            Open Dossier <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

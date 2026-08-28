'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { ShieldAlert, TrendingUp, Zap, Clock, ExternalLink, Globe } from 'lucide-react';

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
  const getBandBadge = (band: 'red' | 'orange' | 'green', score: number) => {
    switch (band) {
      case 'green':
        return {
          label: 'High Likelihood',
          border: 'border-emerald-500/40 hover:border-emerald-400',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          barColor: 'bg-emerald-500',
          stripe: 'from-emerald-500 to-teal-500',
          glow: 'group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]',
        };
      case 'orange':
        return {
          label: 'Medium Likelihood',
          border: 'border-amber-500/40 hover:border-amber-400',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          barColor: 'bg-amber-500',
          stripe: 'from-amber-500 to-orange-500',
          glow: 'group-hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]',
        };
      case 'red':
      default:
        return {
          label: 'Low Likelihood',
          border: 'border-rose-500/40 hover:border-rose-400',
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          barColor: 'bg-rose-500',
          stripe: 'from-rose-500 to-pink-500',
          glow: 'group-hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'innovation':
        return <Zap className="w-3.5 h-3.5 mr-1 text-purple-400" />;
      case 'investment':
        return <TrendingUp className="w-3.5 h-3.5 mr-1 text-sky-400" />;
      case 'business':
      default:
        return <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-400" />;
    }
  };

  const styling = getBandBadge(opportunity.band, opportunity.probability_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(opportunity)}
      className={`group relative cursor-pointer rounded-xl border ${styling.border} ${
        isSelected ? 'bg-slate-800/90 ring-2 ring-sky-500' : 'bg-slate-900/80 hover:bg-slate-850'
      } backdrop-blur-md p-5 transition-all duration-300 ${styling.glow}`}
    >
      {/* Accent Color Band Stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${styling.stripe}`} />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center flex-wrap gap-2">
          {/* Type Badge */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {getTypeIcon(opportunity.type)}
            {opportunity.type.toUpperCase()}
          </span>

          {/* Sector & Region Tags */}
          {opportunity.dominant_sector && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
              {opportunity.dominant_sector.toUpperCase()}
            </span>
          )}
          {opportunity.primary_region && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
              <Globe className="w-3 h-3 mr-1 text-slate-500" />
              {opportunity.primary_region}
            </span>
          )}
        </div>

        {/* Viability Band Badge */}
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${styling.badgeBg}`}>
          {opportunity.probability_score}% • {styling.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 mb-2">
        {opportunity.title}
      </h3>

      {/* Executive Summary */}
      <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
        {opportunity.short_description}
      </p>

      {/* Component Scores Progress Bars */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 mb-3 text-xs">
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Feasibility</span>
            <span className="font-semibold text-slate-200">{opportunity.feasibility_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${styling.barColor}`}
              style={{ width: `${opportunity.feasibility_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Impact</span>
            <span className="font-semibold text-slate-200">{opportunity.impact_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${styling.barColor}`}
              style={{ width: `${opportunity.impact_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Time to Market</span>
            <span className="font-semibold text-slate-200">{opportunity.time_to_market_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${styling.barColor}`}
              style={{ width: `${opportunity.time_to_market_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span className="inline-flex items-center">
          <Clock className="w-3.5 h-3.5 mr-1" />
          {opportunity.source_count} source signal{opportunity.source_count !== 1 ? 's' : ''}
        </span>
        <span className="group-hover:text-sky-400 font-medium inline-flex items-center transition-colors">
          View Detail & AI Analysis <ExternalLink className="w-3 h-3 ml-1" />
        </span>
      </div>
    </motion.div>
  );
};

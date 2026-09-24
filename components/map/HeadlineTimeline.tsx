'use client';

import React from 'react';
import { ArticleHeadlineItem } from '@/src/types/mapTypes';
import { ExternalLink, Clock, Tag, FileText } from 'lucide-react';

interface HeadlineTimelineProps {
  headlines: ArticleHeadlineItem[];
}

export const HeadlineTimeline: React.FC<HeadlineTimelineProps> = ({ headlines }) => {
  if (!headlines || headlines.length === 0) {
    return (
      <div className="py-6 text-center text-xs font-sans-technical text-slate-500 bg-[#050811] rounded-lg border border-slate-800/80">
        No recent field note events recorded for this location.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {headlines.map((item) => {
        const formattedDate = new Date(item.published_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={item.id}
            className="p-3.5 bg-[#050811]/70 hover:bg-[#050811] border border-slate-800/80 hover:border-orange-500/60 rounded-xl transition-all text-xs flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans-technical font-bold text-slate-200 hover:text-orange-400 transition-colors line-clamp-2 flex items-center leading-snug"
              >
                <span>{item.title}</span>
                <ExternalLink className="w-3 h-3 ml-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono-technical text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-slate-400">
                  <Clock className="w-3 h-3 mr-1 text-slate-500" />
                  <span suppressHydrationWarning>{formattedDate}</span>
                </span>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300 font-semibold">{item.source}</span>
              </div>

              {item.matched_sectors && item.matched_sectors.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Tag className="w-2.5 h-2.5 text-orange-400" />
                  <span className="uppercase text-[9px] tracking-wider text-orange-400 font-bold">
                    {item.matched_sectors[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

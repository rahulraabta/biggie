import React from 'react';
import { ArticleHeadlineItem } from '@/src/types/mapTypes';
import { ExternalLink, Clock, Tag } from 'lucide-react';

interface HeadlineTimelineProps {
  headlines: ArticleHeadlineItem[];
}

export const HeadlineTimeline: React.FC<HeadlineTimelineProps> = ({ headlines }) => {
  if (!headlines || headlines.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
        No recent headline events recorded for this location.
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
            className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-colors text-xs flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-200 hover:text-sky-400 transition-colors line-clamp-2 flex items-center"
              >
                <span>{item.title}</span>
                <ExternalLink className="w-3 h-3 ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-slate-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedDate}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 font-medium">{item.source}</span>
              </div>

              {item.matched_sectors && item.matched_sectors.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Tag className="w-2.5 h-2.5 text-sky-400" />
                  <span className="uppercase text-[9px] tracking-wider text-sky-400 font-semibold">
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

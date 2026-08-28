'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { OpportunityDetailDrawer } from '@/components/cards/OpportunityDetailDrawer';
import { QAPanel } from '@/components/qa/QAPanel';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Layers, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [opportunities, setOpportunities] = useState<OpportunityResponseItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('highest_probability');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Opportunity for Detail Drawer & Active Context for Q&A
  const [detailOpportunity, setDetailOpportunity] = useState<OpportunityResponseItem | null>(null);
  const [activeQAOpportunity, setActiveQAOpportunity] = useState<OpportunityResponseItem | null>(null);

  // Mobile drawer toggles
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [mobileQAOpen, setMobileQAOpen] = useState<boolean>(false);

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedBand !== 'all') params.append('band', selectedBand);
      if (selectedSector !== 'all') params.append('sector', selectedSector);
      if (selectedRegion !== 'all') params.append('region', selectedRegion);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedSort) params.append('sort', selectedSort);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOpportunities(data.opportunities || []);
        setTotalCount(data.count || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch opportunities');
      }
    } catch (err: any) {
      console.error('[Dashboard Page Error]', err);
      setError(err.message || 'Failed to load opportunity radar signals.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBand, selectedSector, selectedRegion, selectedType, selectedSort, searchQuery]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleResetFilters = () => {
    setSelectedBand('all');
    setSelectedSector('all');
    setSelectedRegion('all');
    setSelectedType('all');
    setSelectedSort('highest_probability');
    setSearchQuery('');
  };

  const handleSelectCard = (opportunity: OpportunityResponseItem) => {
    setDetailOpportunity(opportunity);
    setActiveQAOpportunity(opportunity);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={fetchOpportunities}
        isLoading={isLoading}
        toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        toggleQA={() => setMobileQAOpen(!mobileQAOpen)}
      />

      {/* Real-time Status Bar */}
      <StatsBar opportunities={opportunities} totalCount={totalCount} />

      {/* Main 3-Panel Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel 1: Filter Sidebar */}
        <Sidebar
          selectedBand={selectedBand}
          onBandChange={setSelectedBand}
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
          onReset={handleResetFilters}
          isOpenMobile={mobileSidebarOpen}
        />

        {/* Panel 2: Opportunity Radar Center Grid */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-sky-400" />
                  Opportunity Radar ({opportunities.length} Signals)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtered global GDELT events grouped into actionable business, innovation, & investment prospects.
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                <p className="text-sm font-medium">Scanning GDELT & Computing Viability Scores...</p>
              </div>
            )}

            {/* Error Banner */}
            {error && !isLoading && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs mb-6">
                <strong className="font-bold">Error loading radar signals:</strong> {error}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && opportunities.length === 0 && (
              <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto">
                <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200 mb-1">No Opportunities Match Your Current Filters</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Try broadening your sector, region, or viability band filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Opportunity Radar Card Grid */}
            {!isLoading && !error && opportunities.length > 0 && (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4"
              >
                <AnimatePresence>
                  {opportunities.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      isSelected={detailOpportunity?.id === opp.id}
                      onSelect={handleSelectCard}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </main>

        {/* Panel 3: Interactive AI Q&A Panel */}
        <QAPanel
          activeOpportunity={activeQAOpportunity}
          onClearActiveOpportunity={() => setActiveQAOpportunity(null)}
          isOpenMobile={mobileQAOpen}
          onCloseMobile={() => setMobileQAOpen(false)}
        />
      </div>

      {/* Slide-over Detail Drawer */}
      <OpportunityDetailDrawer
        opportunity={detailOpportunity}
        onClose={() => setDetailOpportunity(null)}
        onSelectForQA={(opp) => {
          setActiveQAOpportunity(opp);
          setMobileQAOpen(true);
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

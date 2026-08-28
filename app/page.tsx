'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { OpportunityDetailDrawer } from '@/components/cards/OpportunityDetailDrawer';
import { QAPanel } from '@/components/qa/QAPanel';
import { OpportunityGlobe } from '@/components/globe/OpportunityGlobe';
import { CountryIntelPanel } from '@/components/map/CountryIntelPanel';
import { RegionIntelPanel } from '@/components/map/RegionIntelPanel';
import { AggregationIntelPanel } from '@/components/map/AggregationIntelPanel';
import { FocusMarketNavRail } from '@/components/map/FocusMarketNavRail';
import { getFocusMarket, isAggregationMarket } from '@/src/config/focusMarkets';
import { MapOverviewResponse, CountryIntelligenceSummary, RegionalIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Layers, Sparkles, RefreshCw, ShieldCheck, ArrowRight, BarChart2, X } from 'lucide-react';
import { getBandMetadata } from '@/src/utils/geoUtils';
import { MotionMode, getSystemPreferredMotionMode, saveMotionModePreference } from '@/components/globe/motionConfig';

export default function DashboardPage() {
  // Main Navigation Mode: 'earth' (3D Globe Stage) vs 'grid' (Analytical Card Grid)
  const [activeTab, setActiveTab] = useState<'earth' | 'grid'>('earth');

  // Map Overview Data
  const [mapOverview, setMapOverview] = useState<MapOverviewResponse | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(true);

  // Priority Market Focus State
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<string>('7d');
  const [announcement, setAnnouncement] = useState<string>('');

  // Selected Country / Region State
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [countrySummary, setCountrySummary] = useState<CountryIntelligenceSummary | null>(null);
  const [isCountryLoading, setIsCountryLoading] = useState<boolean>(false);

  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);
  const [regionSummary, setRegionSummary] = useState<RegionalIntelligenceSummary | null>(null);
  const [isRegionLoading, setIsRegionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedRegionName) {
      setAnnouncement(`${selectedRegionName} regional hotspot selected.`);
    } else if (selectedCountryCode && countrySummary) {
      setAnnouncement(
        `${countrySummary.name} selected. ${countrySummary.totalSignals} active signals. ${countrySummary.bandCounts.green} High viability opportunities.`
      );
    } else if (selectedMarketId) {
      const market = getFocusMarket(selectedMarketId);
      setAnnouncement(`${market?.displayName || selectedMarketId} focus market selected.`);
    } else {
      setAnnouncement('Global World Overview view active.');
    }
  }, [selectedCountryCode, selectedRegionName, selectedMarketId, countrySummary]);

  // Opportunities List State for Grid View & Stats
  const [opportunities, setOpportunities] = useState<OpportunityResponseItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Globe Controls State
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [motionMode, setMotionMode] = useState<MotionMode>('full');

  useEffect(() => {
    setMotionMode(getSystemPreferredMotionMode());
  }, []);

  const handleMotionModeChange = (newMode: MotionMode) => {
    setMotionMode(newMode);
    saveMotionModePreference(newMode);
  };

  // Filter States for Analytical Grid View
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('highest_probability');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Opportunity for Detail Drawer & AI Q&A Context
  const [detailOpportunity, setDetailOpportunity] = useState<OpportunityResponseItem | null>(null);
  const [activeQAOpportunity, setActiveQAOpportunity] = useState<OpportunityResponseItem | null>(null);

  // Mobile drawer toggles
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [mobileQAOpen, setMobileQAOpen] = useState<boolean>(false);
  const [mobileIntelOpen, setMobileIntelOpen] = useState<boolean>(false);

  // Fetch Map Overview Data
  const fetchMapOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const res = await fetch('/api/map/overview');
      const data: MapOverviewResponse = await res.json();
      if (data.success) {
        setMapOverview(data);
      }
    } catch (err) {
      console.error('[Map Overview Fetch Error]', err);
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  // Fetch Country Intelligence Summary
  const fetchCountrySummary = useCallback(async (code: string) => {
    setIsCountryLoading(true);
    setSelectedRegionName(null);
    setRegionSummary(null);
    try {
      const res = await fetch(`/api/map/country?code=${code}`);
      const data = await res.json();
      if (data.success) {
        setCountrySummary(data.country);
        setMobileIntelOpen(true);
      }
    } catch (err) {
      console.error('[Country Summary Fetch Error]', err);
    } fontally: {
      setIsCountryLoading(false);
    }
  }, []);

  // Fetch Regional Intelligence Summary
  const fetchRegionSummary = useCallback(async (countryCode: string, regionName: string) => {
    setIsRegionLoading(true);
    try {
      const res = await fetch(`/api/map/region?country=${countryCode}&region=${encodeURIComponent(regionName)}`);
      const data = await res.json();
      if (data.success) {
        setRegionSummary(data.region);
        setSelectedRegionName(regionName);
        setMobileIntelOpen(true);
      }
    } catch (err) {
      console.error('[Region Summary Fetch Error]', err);
    } finally {
      setIsRegionLoading(false);
    }
  }, []);

  // Fetch Opportunity List for Grid & Stats
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
    fetchMapOverview();
    fetchOpportunities();
  }, [fetchMapOverview, fetchOpportunities]);

  const handleSelectCountry = (code: string) => {
    setSelectedCountryCode(code);
    setSelectedMarketId(code);
    fetchCountrySummary(code);
  };

  const handleSelectMarket = (marketId: string | null) => {
    setSelectedMarketId(marketId);
    if (!marketId || marketId === 'GLOBAL') {
      handleResetWorldView();
      return;
    }

    const market = getFocusMarket(marketId);
    if (market) {
      if (market.kind === 'country' && market.isoCode) {
        setSelectedCountryCode(market.isoCode);
        fetchCountrySummary(market.isoCode);
      } else {
        // Aggregation market (EU, ROW)
        setSelectedCountryCode(null);
        setCountrySummary(null);
        setSelectedRegionName(null);
        setRegionSummary(null);
        setMobileIntelOpen(true);
      }
    }
  };

  const handleResetWorldView = () => {
    setSelectedMarketId(null);
    setSelectedCountryCode(null);
    setCountrySummary(null);
    setSelectedRegionName(null);
    setRegionSummary(null);
    setMobileIntelOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedBand('all');
    setSelectedSector('all');
    setSelectedRegion('all');
    setSelectedType('all');
    setSelectedSort('highest_probability');
    setSearchQuery('');
  };

  const handleSelectCard = (opportunity: OpportunityResponseItem | OpportunitySummaryItem) => {
    setDetailOpportunity(opportunity as OpportunityResponseItem);
    setActiveQAOpportunity(opportunity as OpportunityResponseItem);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Screen Reader Live Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => {
          fetchMapOverview();
          fetchOpportunities();
        }}
        isLoading={isLoading || isOverviewLoading}
        toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        toggleQA={() => setMobileQAOpen(!mobileQAOpen)}
      />

      {/* Navigation Sub-Header (Mode Switcher & Stats Bar) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Navigation Mode Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('earth')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'earth'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Opportunity Earth (3D Radar)</span>
          </button>

          <button
            onClick={() => setActiveTab('grid')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'grid'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytical Signal Grid ({opportunities.length})</span>
          </button>
        </div>

        {/* Real-Time Metrics Pills */}
        <div className="hidden md:flex items-center space-x-3 text-xs">
          <span className="text-slate-400">
            Active Regions: <strong className="text-slate-200">{mapOverview?.totalCountriesActive || 7}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">
            High Viability: {mapOverview?.bandCounts.green || 4}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: 3D Opportunity Earth Radar Main Stage */}
        {activeTab === 'earth' && (
          <div className="flex-1 flex overflow-hidden relative">
            {/* 3D Globe Stage */}
            <div className="flex-1 relative h-[calc(100vh-140px)] min-h-[500px]">
              {/* Priority Focus Markets Navigation Rail */}
              <FocusMarketNavRail
                selectedMarketId={selectedMarketId}
                selectedCountryCode={selectedCountryCode}
                onSelectMarket={handleSelectMarket}
                onResetView={handleResetWorldView}
              />

              <OpportunityGlobe
                points={mapOverview?.points || []}
                selectedCountryCode={selectedCountryCode}
                selectedRegionName={selectedRegionName}
                selectedMarketId={selectedMarketId}
                onSelectCountry={handleSelectCountry}
                onResetView={handleResetWorldView}
                isAutoRotate={isAutoRotate}
                onToggleAutoRotate={() => setIsAutoRotate(!isAutoRotate)}
                motionMode={motionMode}
                onMotionModeChange={handleMotionModeChange}
              />
            </div>

            {/* Desktop Dynamic Right Intelligence Panel */}
            <div className="hidden lg:block w-[420px] h-[calc(100vh-140px)] border-l border-slate-800 bg-slate-900/90 backdrop-blur-xl">
              {/* State A: Region Selected */}
              {selectedRegionName && regionSummary && (
                <RegionIntelPanel
                  region={regionSummary}
                  onClose={() => {
                    setSelectedRegionName(null);
                    setRegionSummary(null);
                  }}
                  onBackToCountry={() => {
                    if (selectedCountryCode) fetchCountrySummary(selectedCountryCode);
                  }}
                  onSelectOpportunity={handleSelectCard}
                  isLoading={isRegionLoading}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              )}

              {/* State B: Country Selected */}
              {selectedCountryCode && countrySummary && !selectedRegionName && (
                <CountryIntelPanel
                  country={countrySummary}
                  onClose={handleResetWorldView}
                  onSelectOpportunity={handleSelectCard}
                  onSelectRegion={(rName) => fetchRegionSummary(selectedCountryCode, rName)}
                  isLoading={isCountryLoading}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              )}

              {/* State C: Aggregation Market View (EU, ROW, etc.) */}
              {!selectedCountryCode && selectedMarketId && isAggregationMarket(selectedMarketId) && (
                <AggregationIntelPanel
                  market={getFocusMarket(selectedMarketId)!}
                  mapOverview={mapOverview}
                  opportunities={opportunities}
                  onClose={handleResetWorldView}
                  onSelectCountry={handleSelectCountry}
                  onSelectOpportunity={handleSelectCard}
                  onSelectRegion={(rName) => {
                    if (selectedCountryCode) fetchRegionSummary(selectedCountryCode, rName);
                  }}
                />
              )}

              {/* State D: Global Overview (No Selection) */}
              {!selectedCountryCode && (!selectedMarketId || selectedMarketId === 'GLOBAL') && (
                <div className="h-full p-6 overflow-y-auto flex flex-col text-slate-100">
                  <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-4">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Global Market Pulse</h2>
                      <p className="text-xs text-slate-400">Select any country or signal node to drill down</p>
                    </div>
                  </div>

                  {/* High Level Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Global Signal Density
                      </span>
                      <span className="text-lg font-bold text-sky-400">
                        {mapOverview?.totalGlobalSignals || 85}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl">
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider block mb-1">
                        High-Viability Prospects
                      </span>
                      <span className="text-lg font-bold text-emerald-300">
                        {mapOverview?.bandCounts.green || 4}
                      </span>
                    </div>
                  </div>

                  {/* Top Active Countries */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Top Country Hubs
                    </h3>
                    <div className="space-y-2">
                      {(mapOverview?.points || []).slice(0, 5).map((pt) => {
                        const bandMeta = getBandMetadata(pt.topOpportunityBand);
                        return (
                          <div
                            key={pt.id}
                            onClick={() => handleSelectCountry(pt.countryCode)}
                            className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 hover:border-sky-500/80 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-200 group-hover:text-sky-400 transition-colors">
                                {pt.countryName} ({pt.countryCode})
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Sector: <strong className="text-slate-300 uppercase">{pt.dominantSector}</strong>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${bandMeta.bgClass} ${bandMeta.textClass} ${bandMeta.borderClass}`}>
                                {pt.greenCount} High
                              </span>
                              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top High-Viability Opportunities */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Top High-Viability Signals
                    </h3>
                    <div className="space-y-3">
                      {opportunities.slice(0, 3).map((opp) => (
                        <div
                          key={opp.id}
                          onClick={() => handleSelectCard(opp)}
                          className="p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/80 rounded-xl transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1">
                              {opp.title}
                            </span>
                            <span className="text-xs font-bold text-emerald-400 shrink-0">
                              {opp.probability_score}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {opp.short_description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Analytical Card Grid View */}
        {activeTab === 'grid' && (
          <div className="flex-1 flex overflow-hidden relative">
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

            <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                      <Layers className="w-4 h-4 mr-2 text-sky-400" />
                      Analytical Opportunity Signals ({opportunities.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Multi-parameter filtering engine for business, innovation, & investment prospects.
                    </p>
                  </div>
                </div>

                {isLoading && (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                    <p className="text-sm font-medium">Computing Opportunity Scores...</p>
                  </div>
                )}

                {error && !isLoading && (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs mb-6">
                    <strong className="font-bold">Error loading radar signals:</strong> {error}
                  </div>
                )}

                {!isLoading && !error && opportunities.length > 0 && (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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
          </div>
        )}

        {/* Co-Pilot AI Q&A Panel */}
        <QAPanel
          activeOpportunity={activeQAOpportunity}
          onClearActiveOpportunity={() => setActiveQAOpportunity(null)}
          isOpenMobile={mobileQAOpen}
          onCloseMobile={() => setMobileQAOpen(false)}
        />
      </div>

      {/* Mobile Intelligence Bottom Sheet / Drawer */}
      <AnimatePresence>
        {mobileIntelOpen && (selectedCountryCode || selectedRegionName || (selectedMarketId && isAggregationMarket(selectedMarketId))) && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-x-0 bottom-0 top-16 z-50 lg:hidden bg-slate-900/98 backdrop-blur-2xl border-t border-slate-800 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Location & Market Intelligence
              </span>
              <button
                onClick={() => setMobileIntelOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label="Close Mobile Intelligence Sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedRegionName && regionSummary ? (
                <RegionIntelPanel
                  region={regionSummary}
                  onClose={() => setMobileIntelOpen(false)}
                  onBackToCountry={() => {
                    if (selectedCountryCode) fetchCountrySummary(selectedCountryCode);
                  }}
                  onSelectOpportunity={handleSelectCard}
                  isLoading={isRegionLoading}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              ) : selectedCountryCode && countrySummary ? (
                <CountryIntelPanel
                  country={countrySummary}
                  onClose={() => setMobileIntelOpen(false)}
                  onSelectOpportunity={handleSelectCard}
                  onSelectRegion={(rName) => fetchRegionSummary(selectedCountryCode, rName)}
                  isLoading={isCountryLoading}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              ) : selectedMarketId && isAggregationMarket(selectedMarketId) ? (
                <AggregationIntelPanel
                  market={getFocusMarket(selectedMarketId)!}
                  mapOverview={mapOverview}
                  opportunities={opportunities}
                  onClose={() => setMobileIntelOpen(false)}
                  onSelectCountry={handleSelectCountry}
                  onSelectOpportunity={handleSelectCard}
                  onSelectRegion={(rName) => {
                    if (selectedCountryCode) fetchRegionSummary(selectedCountryCode, rName);
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
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

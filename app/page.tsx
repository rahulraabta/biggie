'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { SmartMemoExport } from '@/components/ui/SmartMemoExport';
import { HeroStrip } from '@/components/layout/HeroStrip';
import { CommandMetricsRow } from '@/components/layout/CommandMetricsRow';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { OpportunityCard } from '@/components/cards/OpportunityCard';
import { OpportunityDetailDrawer } from '@/components/cards/OpportunityDetailDrawer';
import { QAPanel } from '@/components/qa/QAPanel';
import { OpportunityGlobe } from '@/components/globe/OpportunityGlobe';
import { RadarActivityOverlay } from '@/components/globe/RadarActivityOverlay';
import { WorldSignalOverlay } from '@/components/layout/WorldSignalOverlay';
import { CountryIntelPanel } from '@/components/map/CountryIntelPanel';
import { RegionIntelPanel } from '@/components/map/RegionIntelPanel';
import { AggregationIntelPanel } from '@/components/map/AggregationIntelPanel';
import { FocusMarketNavRail } from '@/components/map/FocusMarketNavRail';
import { MarketPulseTable } from '@/components/dashboard/MarketPulseTable';
import { OpportunityWatchList } from '@/components/dashboard/OpportunityWatchList';
import { TrendingSectorsBar } from '@/components/dashboard/TrendingSectorsBar';
import { RadarExplanatoryGuide } from '@/components/dashboard/RadarExplanatoryGuide';
import { CosmicSpaceCanvas } from '@/components/space/CosmicSpaceCanvas';
import { getFocusMarket, isAggregationMarket } from '@/src/config/focusMarkets';
import { MapOverviewResponse, CountryIntelligenceSummary, RegionalIntelligenceSummary, OpportunitySummaryItem } from '@/src/types/mapTypes';
import { OpportunityResponseItem } from '@/app/api/opportunities/route';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Layers, Sparkles, RefreshCw, ShieldCheck, ArrowRight, BarChart2, X, Compass, Filter, Bot, ChevronLeft } from 'lucide-react';
import { getBandMetadata, getPinCoordinates } from '@/src/utils/geoUtils';
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

  // Selected Opportunity for 30% Features Pane Inspector & AI Q&A Context
  const [detailOpportunity, setDetailOpportunity] = useState<OpportunityResponseItem | null>(null);
  const [activeQAOpportunity, setActiveQAOpportunity] = useState<OpportunityResponseItem | null>(null);

  // Globe focus lock: while a dossier is open, the camera tweens toward the
  // opportunity's coordinates — its own pin lat/lng when present, otherwise
  // the capital/centroid anchor for its region code.
  const globeFocusTarget = useMemo(() => {
    if (!detailOpportunity) return null;
    if (typeof detailOpportunity.latitude === 'number' && typeof detailOpportunity.longitude === 'number') {
      return { lat: detailOpportunity.latitude, lng: detailOpportunity.longitude };
    }
    const region = detailOpportunity.region || detailOpportunity.primary_region || 'GLOBAL';
    const geo = getPinCoordinates(region);
    return { lat: geo.lat, lng: geo.lng };
  }, [detailOpportunity]);

  // Mobile drawer toggles
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [mobileQAOpen, setMobileQAOpen] = useState<boolean>(false);
  const [mobileIntelOpen, setMobileIntelOpen] = useState<boolean>(false);

  // Docked Assistant State (10% docked vs expanded)
  const [isQADocked, setIsQADocked] = useState<boolean>(false);

  // Dossiers Slide-Over Drawer (Immersive Earth Stage) — collapsed by default
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Global Command Palette (⌘K Search) — collapsed by default
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Global ⌘K / Ctrl+K toggle — the palette itself is a controlled child, so
  // the shortcut owner lives here at the page root alongside its state.
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
    } finally {
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
      const json = await res.json();

      // Support both a direct array and a wrapped payload ({opportunities} / {data})
      const list: OpportunityResponseItem[] = Array.isArray(json)
        ? json
        : json.opportunities || json.data || [];

      if (json.success) {
        setOpportunities(list);
        setTotalCount(json.count || list.length);
        // Debug: what actually landed in state. Query + status are included so
        // this line is directly comparable against a manual param-less API call.
        console.log('[Page] Loaded opportunities count:', list.length, {
          status: res.status,
          query: params.toString() || '(no filters)',
          source: json.source,
        });
      } else {
        throw new Error(json.error || 'Failed to fetch opportunities');
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
    // Slide the dossiers drawer open over the canvas so the inspector is visible
    setIsDossierOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden relative">
      {/* Background Canvas Particles */}
      <CosmicSpaceCanvas />

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
        sourceMode={mapOverview?.source}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        motionMode={motionMode}
        onMotionModeChange={handleMotionModeChange}
        toggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        toggleQA={() => setMobileQAOpen(!mobileQAOpen)}
        onOpenCommandPalette={() => setIsSearchOpen(true)}
      />

      {/* Hero Intelligence Context Strip */}
      <HeroStrip
        sourceMode={mapOverview?.source}
        totalGlobalSignals={mapOverview?.totalGlobalSignals}
        totalOpportunities={opportunities.length}
        lastUpdated={mapOverview?.lastUpdated}
        timeWindow={timeWindow}
      />

      {/* Command Center Real-Time Metrics Row */}
      <CommandMetricsRow
        mapOverview={mapOverview}
        totalOpportunitiesCount={opportunities.length}
        isLoading={isOverviewLoading || isLoading}
      />

      {/* Navigation Sub-Header Mode Switcher */}
      <div className="glass-chrome border-b border-white/10 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-2xl ring-1 ring-white/10 backdrop-blur-md">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab('earth')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'earth'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Opportunity Earth (3D Radar Map)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'grid'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytical Signal Grid ({opportunities.length})</span>
          </motion.button>
        </div>

        {/* Layout Split Ratio Badge + Smart Memo Export */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="hidden md:inline text-slate-400 font-bold">
            Immersive Stage: <strong className="text-emerald-300">Full-Width 3D Earth | Dossiers & Atlas on Demand</strong>
          </span>
          <SmartMemoExport />
        </div>
      </div>

      {/* Immersive Main Stage: Full-Width World Map + AI Scout Rail + On-Demand Dossiers Drawer */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-[calc(100vh-220px)] bg-slate-950">
        {activeTab === 'earth' ? (
          <div className="w-full flex flex-col lg:flex-row overflow-hidden relative min-h-0">
            {/* FULL-WIDTH WORLD MAP STAGE — the globe is the centerpiece, no sidebar compression */}
            <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden border-r border-white/10 min-h-[500px] bg-black">
              {/* World Signal Stage Overlay */}
              <WorldSignalOverlay
                selectedCountryCode={selectedCountryCode}
                selectedRegionName={selectedRegionName}
                selectedMarketId={selectedMarketId}
                totalGlobalSignals={mapOverview?.totalGlobalSignals}
                onSwitchToGrid={() => setActiveTab('grid')}
              />

              {/* Priority Focus Markets Navigation Rail */}
              <FocusMarketNavRail
                selectedMarketId={selectedMarketId}
                selectedCountryCode={selectedCountryCode}
                onSelectMarket={handleSelectMarket}
                onResetView={handleResetWorldView}
              />

              {/* Radar Status & Activity Overlay */}
              <RadarActivityOverlay
                timeWindow={timeWindow}
                selectedMarketId={selectedMarketId}
                selectedCountryCode={selectedCountryCode}
                selectedRegionName={selectedRegionName}
                granularity={regionSummary?.granularity || countrySummary?.granularity || 'country'}
                sourceMode={mapOverview?.source}
                lastUpdated={mapOverview?.lastUpdated}
              />

              {/* Standard World Map Globe View */}
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
                opportunities={opportunities}
                onSelectOpportunity={(id) => {
                  const opp = opportunities.find((o) => o.id === id);
                  if (opp) {
                    setDetailOpportunity(opp);
                    setActiveQAOpportunity(opp);
                    setIsDossierOpen(true);
                  }
                }}
                focusTarget={globeFocusTarget}
              />
            </div>

            {/* RIGHT RAIL: Radar Scout AI Assistant Chatbot */}
            <div className="hidden lg:flex w-full lg:w-[10%] xl:w-[10%] min-w-[280px] min-h-0">
              <QAPanel
                activeOpportunity={activeQAOpportunity}
                onClearActiveOpportunity={() => setActiveQAOpportunity(null)}
                isOpenMobile={mobileQAOpen}
                onCloseMobile={() => setMobileQAOpen(false)}
                isDocked={isQADocked}
                onToggleDock={() => setIsQADocked(!isQADocked)}
              />
            </div>

            {/* Floating Dossiers Toggle — glassmorphism, top-left of the immersive stage */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsDossierOpen((v) => !v)}
              className={`absolute top-4 left-4 z-40 flex items-center space-x-2.5 rounded-2xl px-4 py-2.5 text-xs backdrop-blur-md border transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] ${
                isDossierOpen
                  ? 'bg-emerald-500/90 border-emerald-300/50 text-slate-950'
                  : 'glass-panel border-white/10 text-slate-100 hover:bg-white/10'
              }`}
              aria-expanded={isDossierOpen}
              aria-label={isDossierOpen ? 'Hide dossiers drawer' : 'View dossiers drawer'}
            >
              <Layers className={`w-4 h-4 ${isDossierOpen ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span className="font-mono font-extrabold uppercase tracking-wider">
                {isDossierOpen ? 'Hide Dossiers' : 'View Dossiers'}
                <span className={isDossierOpen ? 'text-slate-800' : 'text-emerald-300'}> ({opportunities.length})</span>
              </span>
              <ChevronLeft
                className={`w-4 h-4 transition-transform duration-300 ${
                  isDossierOpen ? 'text-slate-950' : 'text-emerald-300 rotate-180'
                }`}
              />
            </motion.button>

            {/* Dossiers Slide-Over Drawer — slides out over the canvas, collapsed by default */}
            <AnimatePresence>
              {isDossierOpen && (
                <>
                  {/* Click-away scrim over the globe */}
                  <motion.div
                    key="dossier-scrim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setIsDossierOpen(false)}
                    className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
                    aria-hidden="true"
                  />

                  <motion.aside
                    key="dossier-drawer"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                    className="absolute inset-y-0 left-0 z-30 w-[92vw] sm:w-[420px] glass-chrome backdrop-blur-md border-r border-white/10 flex flex-col overflow-hidden shadow-2xl"
                    aria-label="Features and dossiers drawer"
                    role="dialog"
                  >
                    <div className="flex items-center justify-between p-4 pb-3 border-b border-white/10">
                          <h2 className="text-xs font-mono font-black text-emerald-300 uppercase tracking-wider flex items-center">
                            <Sparkles className="w-4 h-4 mr-1.5 text-emerald-400" />
                            Features & Dossiers ({opportunities.length})
                          </h2>
                          <button
                            onClick={() => setIsDossierOpen(false)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all"
                            aria-label="Close dossiers drawer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <p className="text-xs text-slate-400 font-medium">
                            Select any opportunity card to inspect complete feasibility, CapEx, and risk drivers — the globe stays live behind the drawer.
                          </p>

                          <div className="space-y-3">
                            {opportunities.map((opp) => (
                              <OpportunityCard
                                key={opp.id}
                                opportunity={opp}
                                isSelected={(detailOpportunity as OpportunityResponseItem | null)?.id === opp.id}
                                onSelect={handleSelectCard}
                              />
                            ))}
                          </div>
                        </div>
                    </motion.aside>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* TAB 2: Analytical Card Grid View */
          <div className="flex-1 flex overflow-hidden relative w-full">
            <div className="w-64 border-r border-white/10">
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
            </div>

            <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-100 uppercase tracking-wider flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-emerald-400" />
                      Analytical Signals ({opportunities.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Multi-parameter filtering engine for business, innovation, & investment prospects.
                    </p>
                  </div>
                </div>

                {isLoading && (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center font-mono">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                    <p className="text-sm font-bold text-slate-200">Computing Opportunity Scores...</p>
                  </div>
                )}

                {error && !isLoading && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/40 text-rose-300 text-xs mb-6">
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
      </div>

      {/* Lower Dashboard Content Below the Stage */}
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-6 space-y-6 bg-slate-950 relative z-10 border-t border-white/10">
        <TrendingSectorsBar
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
          <MarketPulseTable
            mapOverview={mapOverview}
            selectedMarketId={selectedMarketId}
            selectedCountryCode={selectedCountryCode}
            onSelectMarket={handleSelectMarket}
          />

          <OpportunityWatchList
            opportunities={opportunities}
            onSelectOpportunity={handleSelectCard}
            isLoading={isLoading}
            selectedSector={selectedSector}
            selectedMarket={selectedMarketId}
          />
        </div>

        <RadarExplanatoryGuide />
      </div>

      {/* Signal Dossier — self-anchored fixed right sheet. Lives at the page-tree
          bottom, outside every grid/layout container, so no transformed or
          overflow-clipping ancestor can trap or clip it. */}
      <OpportunityDetailDrawer
        opportunity={detailOpportunity}
        isOpen={detailOpportunity !== null}
        onClose={() => setDetailOpportunity(null)}
        onSelectForQA={(opp) => {
          setActiveQAOpportunity(opp);
          setMobileQAOpen(true);
        }}
      />

      {/* Global Command Palette — keyboard-first (⌘K) search overlay. Mounted
          at the page-tree root: fixed positioning, above the Header (z-40)
          with no transformed or overflow-clipping ancestor to trap it. */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectOpportunity={(opp) => handleSelectCard(opp as OpportunityResponseItem)}
        opportunities={opportunities}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

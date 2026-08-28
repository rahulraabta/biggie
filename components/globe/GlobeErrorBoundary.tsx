'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WorldFallback } from '../map/WorldFallback';
import { OpportunityMapPoint } from '@/src/types/mapTypes';

interface Props {
  children: ReactNode;
  points: OpportunityMapPoint[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  onResetView: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Globe 3D Canvas Error Boundary]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <WorldFallback
          points={this.props.points}
          selectedCountryCode={this.props.selectedCountryCode}
          onSelectCountry={this.props.onSelectCountry}
          onResetView={this.props.onResetView}
        />
      );
    }

    return this.props.children;
  }
}

'use client';

import { ReactNode } from 'react';
import { useDashboardResponsiveScale } from '@/hooks/useDashboardResponsiveScale';

type ResponsiveScalerProps = {
  children: ReactNode;
};

export function ResponsiveScaler({ children }: ResponsiveScalerProps) {
  useDashboardResponsiveScale();
  return <>{children}</>;
}


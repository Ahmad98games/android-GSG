'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { IndustryProvider } from '@/providers/IndustryProvider';
import { ThemeWatcher } from '@/components/ThemeWatcher';
import { CurrencyProvider } from '@/components/providers/CurrencyProvider';
import { useTheme } from '@/hooks/useTheme';
import { BrandingProvider } from '@/providers/BrandingProvider';
import { useEffect } from 'react';
import { PushNotificationService } from '@/lib/push-notifications';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useTheme(); // Initialize theme variables

  useEffect(() => {
    void PushNotificationService.initialize();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <CurrencyProvider>
          <IndustryProvider>
            <ThemeWatcher />
            {children}
          </IndustryProvider>
        </CurrencyProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

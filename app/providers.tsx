'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useOverflowStore } from '@/lib/store';
import { restoreSuiWalletSession } from '@/lib/sui/wallet';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getNetworkConfig } from '@/lib/sui/network-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  // Create a QueryClient instance for React Query (required by dapp-kit)
  const [queryClient] = useState(() => new QueryClient());
  
  // Get network configuration
  const networkConfig = getNetworkConfig();
  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet' | 'localnet';
  
  useEffect(() => {
    // Prevent double initialization in development
    if (initialized.current) return;
    initialized.current = true;
    
    const initializeApp = async () => {
      try {
        // Get store methods directly without subscribing
        const { updatePrice, loadTargetCells } = useOverflowStore.getState();
        
        // Restore Sui wallet session (handled by dapp-kit autoConnect)
        await restoreSuiWalletSession().catch(console.error);
        
        // Load target cells
        await loadTargetCells().catch(console.error);
        
        // Start price feed
        console.log('Starting price feed for real-time BTC/USD prices');
        const stopPriceFeed = startPriceFeed(updatePrice);
        
        // Mark as ready
        setIsReady(true);
        
        // Cleanup
        return () => {
          stopPriceFeed();
        };
      } catch (error) {
        console.error('Error initializing app:', error);
        // Still mark as ready to show the app even if initialization fails
        setIsReady(true);
      }
    };
    
    initializeApp();
  }, []); // Empty deps - only run once
  
  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF006E] mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing OverFlow...</p>
        </div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
        <WalletProvider autoConnect>
          {children}
          <ToastProvider />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

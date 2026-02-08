'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { getUSDCBalance } from '@/lib/sui/client';

export const WalletInfo: React.FC = () => {
  const address = useStore((state) => state.address);
  const isConnected = useStore((state) => state.isConnected);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch USDC balance when wallet connects or address changes
  useEffect(() => {
    if (isConnected && address) {
      setIsLoadingBalance(true);
      getUSDCBalance(address)
        .then(balance => {
          setUsdcBalance(balance);
        })
        .catch(error => {
          console.error('Failed to fetch USDC balance:', error);
          setUsdcBalance(0);
        })
        .finally(() => {
          setIsLoadingBalance(false);
        });
    } else {
      setUsdcBalance(0);
    }
  }, [isConnected, address]);

  if (!isConnected || !address) {
    return null;
  }

  // Format address to show first 6 and last 4 characters
  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format balance to 2 decimal places
  const formatBalance = (bal: number) => {
    return isNaN(bal) ? '0.00' : bal.toFixed(2);
  };

  return (
    <Card className="min-w-[200px] border border-white/10 !bg-black/40 backdrop-blur-md">
      <div className="space-y-2">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">Sui Address</p>
          <p className="text-white font-mono text-xs">{formatAddress(address)}</p>
        </div>

        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">USDC Balance</p>
          <p className="text-neon-blue font-bold text-lg font-mono text-shadow-neon flex items-center gap-1.5">
            {isLoadingBalance ? 'Loading...' : (
              <>
                {formatBalance(usdcBalance)}
                <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5 object-contain" />
                USDC
              </>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};

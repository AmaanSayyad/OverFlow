'use client';

import React, { useState, useEffect } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useStore } from '@/lib/store';
import { LiveChart } from './LiveChart';
import { BalanceDisplay } from '@/components/balance';
import { getUSDCBalance, buildDepositTransaction } from '@/lib/sui/client';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { useToast } from '@/lib/hooks/useToast';

export const GameBoard: React.FC = () => {
  const [betAmount, setBetAmount] = useState<string>('1.0');
  const [activeTab, setActiveTab] = useState<'bet' | 'wallet' | 'x402'>('bet');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [isLoadingBlitz, setIsLoadingBlitz] = useState(false);
  const [blitzCountdown, setBlitzCountdown] = useState<string>('');
  const [blitzTimeRemaining, setBlitzTimeRemaining] = useState<string>('');

  const toast = useToast();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const address = useStore((state) => state.address);
  const isConnected = useStore((state) => state.isConnected);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const updatePrice = useStore((state) => state.updatePrice);

  const isBlitzActive = useStore((state) => state.isBlitzActive);
  const blitzEndTime = useStore((state) => state.blitzEndTime);
  const nextBlitzTime = useStore((state) => state.nextBlitzTime);
  const hasBlitzAccess = useStore((state) => state.hasBlitzAccess);
  const updateBlitzTimer = useStore((state) => state.updateBlitzTimer);
  const enableBlitzAccess = useStore((state) => state.enableBlitzAccess);

  const aiPaymentAmount = 0.01;
  const blitzPaymentAmount = 0.05;

  useEffect(() => {
    const interval = setInterval(() => {
      updateBlitzTimer();
      const now = Date.now();
      if (isBlitzActive && blitzEndTime) {
        const remaining = Math.max(0, blitzEndTime - now);
        setBlitzTimeRemaining(`${Math.floor(remaining / 1000)}s`);
        setBlitzCountdown('');
      } else {
        const timeToNext = Math.max(0, nextBlitzTime - now);
        const mins = Math.floor(timeToNext / 60000);
        const secs = Math.floor((timeToNext % 60000) / 1000);
        setBlitzCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        setBlitzTimeRemaining('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlitzActive, blitzEndTime, nextBlitzTime, updateBlitzTimer]);

  // Start price feed and restart when asset changes
  useEffect(() => {
    console.log(`Starting price feed for ${selectedAsset}`);
    const stopFeed = startPriceFeed(updatePrice, selectedAsset);
    
    return () => {
      console.log(`Stopping price feed for ${selectedAsset}`);
      stopFeed();
    };
  }, [selectedAsset, updatePrice]);

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

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '---';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number) => {
    return isNaN(bal) ? '0.00' : bal.toFixed(2);
  };

  const handleX402Payment = async (amountUsdc: number, endpoint: string): Promise<string | null> => {
    if (!isConnected || !address) {
      toast.error('Please connect your Sui wallet first');
      return null;
    }
    try {
      const res = await fetch(endpoint);
      if (res.status === 503) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.hint || data.error || 'Server config error. Check .env');
      }
      if (res.status !== 402) return 'free';
      const data = await res.json();
      toast.info(`Payment required: ${data.amount || amountUsdc} ${data.asset || 'USDC'}`);

      const tx = await buildDepositTransaction(amountUsdc, address);
      toast.info('Please confirm in your wallet...');
      const result = await new Promise<{ digest: string }>((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: (d: { digest: string }) => resolve(d),
            onError: reject,
          }
        );
      });
      toast.info('Submitting to Sui...');
      return result.digest;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      const msg = err instanceof Error ? err.message : 'Payment failed';
      toast.error(msg);
      return null;
    }
  };

  const fetchAIInsight = async () => {
    setIsLoadingInsight(true);
    try {
      const digest = await handleX402Payment(aiPaymentAmount, '/api/ai/predict');
      if (digest) {
        const sender = address ? (address.startsWith('0x') ? address : `0x${address}`) : '';
        const headers: HeadersInit = digest !== 'free' ? { Authorization: `x402 ${digest}`, 'X-Payment-Sender': sender } : {};
        // Brief delay so the tx is indexed on RPC before we verify
        if (digest !== 'free') await new Promise((r) => setTimeout(r, 1500));
        const response = await fetch('/api/ai/predict', { headers });
        if (response.ok) {
          const data = await response.json();
          setPrediction(data.prediction);
          setConfidence(data.confidence);
          toast.success('AI Insight Unlocked!');
        } else {
          const body = await response.json().catch(() => ({}));
          const hint = body.hint || body.error;
          if (response.status === 503) {
            toast.error(hint || 'Server config error. Check .env (see .env.example).');
          } else {
            toast.error(hint || 'Payment verification failed. Wait a few seconds and try again, or ensure the wallet is on Sui Testnet.');
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') toast.error(e.message || 'Failed to get AI insight');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const enterBlitzRound = async () => {
    if (!isBlitzActive) {
      toast.error('No Blitz Round active! Wait for the next one.');
      return;
    }
    if (hasBlitzAccess) {
      toast.info('You already have Blitz access!');
      return;
    }
    setIsLoadingBlitz(true);
    try {
      const digest = await handleX402Payment(blitzPaymentAmount, '/api/blitz/enter');
      if (digest) {
        enableBlitzAccess();
        toast.success('Blitz Round Access Granted! 2x Multipliers Active!');
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') toast.error('Failed to enter Blitz Round');
    } finally {
      setIsLoadingBlitz(false);
    }
  };

  const handleResetInsight = () => {
    setPrediction(null);
    setConfidence(null);
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Main Interactive Chart */}
      <div className="absolute inset-0 z-0">
        <LiveChart
          betAmount={betAmount}
          setBetAmount={setBetAmount}
        />
      </div>

      {/* Blitz Round Indicator - Top Right */}
      <div className="absolute top-12 sm:top-20 right-3 sm:right-6 z-30 pointer-events-auto">
        <div className={`rounded-xl backdrop-blur-xl border shadow-lg overflow-hidden transition-all duration-500 ${
          isBlitzActive ? 'bg-gradient-to-br from-orange-500/20 via-red-500/20 to-yellow-500/20 border-orange-500/50 shadow-orange-500/30 animate-pulse' : 'bg-black/80 border-gray-700/50'
        }`}>
          <div className="px-3 py-2">
            {isBlitzActive ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-orange-400 text-[9px] font-bold uppercase tracking-wider">BLITZ ACTIVE</p>
                  <p className="text-white text-sm font-bold font-mono">{blitzTimeRemaining} left</p>
                </div>
                {hasBlitzAccess && (
                  <div className="ml-2 px-1.5 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-[8px] text-green-400 font-bold">2x</div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg opacity-50">⏰</span>
                <div>
                  <p className="text-gray-500 text-[9px] font-medium uppercase tracking-wider">Next Blitz</p>
                  <p className="text-gray-300 text-sm font-mono">{blitzCountdown}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toggle Button - Fixed to bottom (Mobile only) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="sm:hidden fixed bottom-4 left-4 w-10 h-10 bg-purple-600 rounded-full shadow-lg shadow-purple-500/40 flex items-center justify-center text-white text-lg font-bold z-40"
        >
          ▲
        </button>
      )}

      {/* Modern Quick Bet Panel - Collapsible on Mobile */}
      <div className="absolute bottom-3 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-auto z-30 pointer-events-none">

        {/* Panel - Animated slide up/down on mobile */}
        <div className={`bg-gradient-to-br from-black/95 via-purple-950/30 to-black/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden w-full sm:w-[300px] transition-all duration-300 ease-out pointer-events-auto ${isPanelOpen
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-full opacity-0 scale-95 !pointer-events-none sm:translate-y-0 sm:opacity-100 sm:scale-100 sm:!pointer-events-auto'
          }`}>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="sm:hidden absolute top-2 right-2 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-xs z-10"
          >
            ✕
          </button>

          {/* Tab Navigation - Bet, Wallet, x402 */}
          <div className="flex gap-1 p-2 bg-black/40">
            <button
              onClick={() => setActiveTab('bet')}
              className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'bet'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Bet
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'wallet'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('x402')}
              className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'x402'
                ? 'bg-gradient-to-r from-[#00f5ff] to-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                : 'text-[#00f5ff]/70 hover:text-[#00f5ff] hover:bg-[#00f5ff]/5'
                }`}
            >
              x402
            </button>
          </div>

          {/* Content Area - Fixed Height */}
          <div className="p-4 min-h-[180px]">
            {activeTab === 'bet' ? (
              <div className="space-y-4">
                {/* Blitz Mode indicator in Bet tab */}
                {isBlitzActive && hasBlitzAccess && (
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <div>
                      <p className="text-orange-400 text-[10px] font-bold uppercase">Blitz Mode Active</p>
                      <p className="text-orange-300 text-[9px]">2x multipliers on boosted cells!</p>
                    </div>
                  </div>
                )}

                {/* Amount Presets */}
                <div>
                  <label className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-2 block">
                    Quick Amount
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 5, 10, 25, 50].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt.toString())}
                        className={`
                          py-2.5 rounded-lg font-bold text-sm transition-all duration-200
                          ${betAmount === amt.toString()
                            ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:scale-102'
                          }
                        `}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input */}
                <div>
                  <label className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-2 block">
                    Custom Amount
                  </label>
                  <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="flex-1 bg-transparent px-2 py-2 text-white font-mono text-base focus:outline-none min-w-0"
                      placeholder="0.00"
                    />
                    <span className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-500/20 rounded-lg text-purple-400 text-[10px] font-bold shrink-0">
                      <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-3.5 h-3.5 object-contain" />
                      USDC
                    </span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'wallet' ? (
              <div className="space-y-4">
                {isConnected && address ? (
                  <>
                    <BalanceDisplay />

                    {/* Address Card */}
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Wallet Address</p>
                      <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
                    </div>

                    {/* Wallet Balance Display */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl p-4 border border-purple-500/20">
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Wallet Balance</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                          {isLoadingBalance ? 'Loading...' : formatBalance(usdcBalance)}
                        </span>
                        <span className="flex items-center gap-1.5 text-purple-400 text-sm font-medium">
                          <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5 object-contain" />
                          USDC
                        </span>
                      </div>
                      <p className="text-gray-500 text-[9px] mt-1.5">
                        On Sui {(process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet').toLowerCase()}. Switch your wallet to this network to see balance.
                      </p>
                    </div>

                    {/* Disconnect Button */}
                    <button
                      onClick={() => useStore.getState().disconnect()}
                      className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-all duration-200"
                    >
                      Disconnect Wallet
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No wallet connected</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg p-3 relative overflow-hidden border ${isBlitzActive ? 'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-yellow-500/10 border-orange-500/40' : 'bg-black/30 border-gray-700/50'}`}>
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500/30 text-orange-400 text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">🔥 Blitz</div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${isBlitzActive ? 'bg-orange-500/20 border-orange-500/30' : 'bg-gray-800/50 border-gray-700/30'}`}>
                      <span className="text-xl">{isBlitzActive ? '🔥' : '⏰'}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[10px] uppercase tracking-wider font-mono ${isBlitzActive ? 'text-orange-400' : 'text-gray-500'}`}>{isBlitzActive ? 'Blitz Active!' : 'Next Blitz In'}</p>
                      <p className={`text-lg font-bold font-mono ${isBlitzActive ? 'text-orange-300' : 'text-gray-400'}`}>{isBlitzActive ? blitzTimeRemaining : blitzCountdown}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-[9px]">Entry Fee</p>
                      <p className="text-orange-400 text-sm font-bold flex items-center gap-1.5">
                        {blitzPaymentAmount} <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain" /> USDC
                      </p>
                    </div>
                  </div>
                  {isBlitzActive && (
                    <button
                      onClick={enterBlitzRound}
                      disabled={isLoadingBlitz || !isConnected || hasBlitzAccess}
                      className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-all ${hasBlitzAccess ? 'bg-green-500/20 border border-green-500/40 text-green-400 cursor-default' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                    >
                      {hasBlitzAccess ? <span className="flex items-center justify-center gap-2"><span>✓</span> 2x Multipliers Active</span> : isLoadingBlitz ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Processing...</span> : !isConnected ? 'Connect Wallet' : `🔥 Enter Blitz (${blitzPaymentAmount} USDC)`}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-800" /><span className="text-gray-600 text-[9px] uppercase">or</span><div className="flex-1 h-px bg-gray-800" /></div>
                <div className="bg-gradient-to-br from-[#00f5ff]/10 to-purple-500/10 border border-[#00f5ff]/30 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#00f5ff]/20 text-[#00f5ff] text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">AI</div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00f5ff]/10 border border-[#00f5ff]/20">
                      <svg className="w-5 h-5 text-[#00f5ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">AI Oracle</p>
                      <p className="text-[#00f5ff] text-lg font-bold font-mono flex items-center gap-1.5">
                        {aiPaymentAmount} <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5 object-contain" /> USDC
                      </p>
                    </div>
                  </div>
                  {prediction ? (
                    <div className="mt-3 space-y-2">
                      <div className="bg-black/50 rounded p-2"><p className="text-gray-100 text-[11px] leading-relaxed">{prediction}</p></div>
                      <div className="flex items-center justify-between"><span className="text-gray-500 text-[9px]">Confidence</span><span className="text-[#00f5ff] text-xs font-bold">{confidence}</span></div>
                      <button onClick={handleResetInsight} className="w-full py-2 bg-[#00f5ff]/10 border border-[#00f5ff]/30 text-[#00f5ff] rounded-lg text-[10px] font-semibold hover:bg-[#00f5ff]/20 transition-all">Get New Insight</button>
                    </div>
                  ) : (
                    <button onClick={fetchAIInsight} disabled={isLoadingInsight || !isConnected} className="w-full mt-3 py-2.5 bg-gradient-to-r from-[#00f5ff] to-cyan-500 text-black rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoadingInsight ? 'Processing...' : `Unlock Insight (${aiPaymentAmount} USDC)`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

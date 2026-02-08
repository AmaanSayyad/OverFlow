'use client';

/**
 * DepositModal Component
 * Modal for depositing USDC tokens into house balance
 * 
 * Task: 7.1 Update DepositModal for Sui
 * Requirements: 2.1, 2.2, 2.4, 2.5, 9.3, 14.2
 */

import React, { useState, useEffect } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { buildDepositTransaction, getUSDCBalance } from '@/lib/sui/client';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  
  const { address, depositFunds, houseBalance } = useOverflowStore();
  const toast = useToast();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  // Quick select amounts
  const quickAmounts = [1, 5, 10, 25];
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  // Debug: Log amount changes
  useEffect(() => {
    console.log('Amount state changed to:', amount);
    console.log('Deposit button should be enabled:', !isLoading && amount && parseFloat(amount || '0') > 0);
  }, [amount, isLoading]);
  
  // Fetch USDC balance when modal opens or address changes
  useEffect(() => {
    if (isOpen && address) {
      getUSDCBalance(address).then(setUsdcBalance).catch(console.error);
    }
  }, [isOpen, address]);
  
  /**
   * Validate deposit amount
   * Returns error message if invalid, null if valid
   * Requirements: 2.1 - Amount must be greater than zero
   */
  const validateAmount = (value: string): string | null => {
    if (!value || value.trim() === '') {
      return 'Please enter an amount';
    }
    
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    
    if (numValue <= 0) {
      return 'Amount must be greater than zero';
    }
    
    if (numValue > usdcBalance) {
      return 'Insufficient USDC balance';
    }
    
    return null;
  };
  
  /**
   * Handle amount input change
   */
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Amount changed:', value);
    
    // Allow empty string, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };
  
  /**
   * Handle quick select button click
   */
  const handleQuickSelect = (value: number) => {
    console.log('Quick select clicked:', value);
    const newAmount = value.toString();
    setAmount(newAmount);
    setError(null);
    console.log('Amount set to:', newAmount);
  };
  
  /**
   * Handle max button click
   * Sets amount to entire USDC balance
   */
  const handleMaxClick = () => {
    if (usdcBalance > 0) {
      setAmount(usdcBalance.toString());
      setError(null);
    }
  };
  
  /**
   * Execute deposit transaction
   * Requirements: 2.1, 2.2, 2.5, 14.2
   */
  const handleDeposit = async () => {
    // Validate amount (Requirement 2.1)
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!address) {
      setError('Please connect your wallet');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const depositAmount = parseFloat(amount);
      
      // Show info toast that transaction is being processed
      toast.info('Please confirm the transaction in your wallet...');
      
      // Build deposit transaction (Requirement 2.2)
      const tx = await buildDepositTransaction(depositAmount, address);
      
      // Execute transaction using Sui wallet
      // Note: signAndExecuteTransaction is a mutate function from React Query
      // We need to wrap it in a Promise to await it properly
      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
          },
          {
            onSuccess: (data: any) => {
              console.log('Transaction submitted successfully:', data);
              resolve(data);
            },
            onError: (error: any) => {
              console.error('Transaction submission failed:', error);
              reject(error);
            },
          }
        );
      });
      
      console.log('Deposit transaction successful:', result.digest);
      
      // Show info toast that transaction is being confirmed
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      // Update balance in database (Requirement 2.4)
      // Note: This will be triggered by event listener, but we call it here for immediate UI update
      await depositFunds(address, depositAmount, result.digest);
      
      // Show success toast with updated balance
      const newBalance = houseBalance + depositAmount;
      toast.success(
        `Successfully deposited ${depositAmount.toFixed(4)} USDC! New balance: ${newBalance.toFixed(4)} USDC`
      );
      
      // Call success callback
      if (onSuccess) {
        onSuccess(depositAmount, result.digest);
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Deposit error:', err);
      
      // The error is already formatted by handleTransactionError in client.ts
      let errorMessage = 'Failed to deposit funds';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Show error toast
      toast.error(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit USDC"
      showCloseButton={!isLoading}
    >
      <div className="space-y-2">
        {/* Wallet Balance Display */}
        <div className="bg-gradient-to-br from-neon-blue/10 to-purple-500/10 border border-neon-blue/30 rounded-lg p-2.5">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5 font-mono">
            Wallet Balance (Sui {(process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet').toLowerCase()})
          </p>
          <p className="text-neon-blue text-base font-bold font-mono flex items-center gap-1.5">
            {usdcBalance.toFixed(4)} <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain" /> USDC
          </p>
          {usdcBalance === 0 && (
            <p className="text-amber-500/90 text-[10px] mt-1 font-mono">
              Showing 0? Switch your wallet to Sui {(process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet').toLowerCase()} and use native USDC on that network.
            </p>
          )}
        </div>
        
        {/* Amount Input */}
        <div>
          <div className="relative">
            <input
              id="deposit-amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={isLoading}
              className={`
                w-full px-3 py-2 bg-black/50 border rounded-lg text-sm
                text-white font-mono
                focus:outline-none focus:ring-1 focus:ring-neon-blue
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500' : 'border-neon-blue/30'}
              `}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 text-xs font-mono">
              <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-3.5 h-3.5 object-contain" /> USDC
            </span>
          </div>
          
          {/* Max Button */}
          <button
            onClick={handleMaxClick}
            disabled={isLoading}
            className="mt-1 text-[10px] text-neon-blue hover:text-cyan-400 font-mono disabled:opacity-50 transition-colors"
          >
            Use Max
          </button>
        </div>
        
        {/* Quick Select Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => handleQuickSelect(quickAmount)}
              disabled={isLoading || usdcBalance < quickAmount}
              className={`
                px-2 py-1 rounded border font-mono text-xs
                transition-all duration-200
                ${
                  amount === quickAmount.toString()
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-black/30 border-neon-blue/30 text-gray-300 hover:border-neon-blue hover:text-neon-blue'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {quickAmount}
            </button>
          ))}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg px-2 py-1.5">
            <p className="text-red-400 text-[10px] font-mono">{error}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            disabled={isLoading}
            className="flex-1 !px-3 !py-1.5 !text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            variant="primary"
            size="sm"
            disabled={isLoading || !amount || parseFloat(amount || '0') <= 0}
            className="flex-1 !px-3 !py-1.5 !text-xs"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-[10px]">Processing...</span>
              </span>
            ) : (
              'Deposit'
            )}
          </Button>
        </div>
        
        {/* Loading State Info */}
        {isLoading && (
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg px-2 py-1.5">
            <p className="text-blue-400 text-[10px] font-mono">
              Confirm transaction in wallet...
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

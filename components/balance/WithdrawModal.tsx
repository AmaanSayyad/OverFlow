'use client';

/**
 * WithdrawModal Component
 * Modal for withdrawing USDC tokens from house balance to wallet
 * 
 * Task: 8.1 Update WithdrawModal for Sui
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 9.3, 14.2, 14.3
 */

import React, { useState, useEffect } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { buildWithdrawalTransaction } from '@/lib/sui/client';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { address, withdrawFunds, houseBalance } = useOverflowStore();
  const toast = useToast();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  /**
   * Validate withdrawal amount
   * Returns error message if invalid, null if valid
   * Requirements: 3.1 - Amount must be greater than zero
   * Requirements: 3.2 - Verify sufficient house balance
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
    
    if (numValue > houseBalance) {
      return 'Insufficient house balance';
    }
    
    return null;
  };
  
  /**
   * Handle amount input change
   */
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };
  
  /**
   * Handle max button click
   * Sets amount to entire house balance
   */
  const handleMaxClick = () => {
    if (houseBalance > 0) {
      setAmount(houseBalance.toString());
      setError(null);
    }
  };
  
  /**
   * Execute withdrawal transaction
   * Requirements: 3.1, 3.2, 3.3, 3.6, 14.2, 14.3
   */
  const handleWithdraw = async () => {
    // Validate amount (Requirement 3.1)
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
      
      const withdrawAmount = parseFloat(amount);
      
      // Validate sufficient balance in Supabase before transaction (Requirement 3.2)
      if (withdrawAmount > houseBalance) {
        throw new Error('Insufficient house balance for withdrawal');
      }
      
      // Show info toast that transaction is being processed
      toast.info('Please confirm the transaction in your wallet...');
      
      // Build withdrawal transaction (Requirement 3.3)
      const tx = buildWithdrawalTransaction(withdrawAmount, address);
      
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
      
      console.log('Withdrawal transaction successful:', result.digest);
      
      // Show info toast that transaction is being confirmed
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      // Update balance in database (Requirement 3.5)
      // Note: This will be triggered by event listener, but we call it here for immediate UI update
      await withdrawFunds(address, withdrawAmount, result.digest);
      
      // Show success toast with updated balance
      const newBalance = houseBalance - withdrawAmount;
      toast.success(
        `Successfully withdrew ${withdrawAmount.toFixed(4)} USDC! New balance: ${newBalance.toFixed(4)} USDC`
      );
      
      // Call success callback
      if (onSuccess) {
        onSuccess(withdrawAmount, result.digest);
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Withdrawal error:', err);
      
      // The error is already formatted by handleTransactionError in client.ts
      let errorMessage = 'Failed to withdraw funds';
      
      if (err instanceof Error) {
        // Check for house balance specific error first
        if (err.message.includes('Insufficient house balance')) {
          errorMessage = 'Insufficient house balance for withdrawal';
        } else {
          errorMessage = err.message;
        }
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
      title="Withdraw USDC"
      showCloseButton={!isLoading}
    >
      <div className="space-y-2">
        {/* House Balance Display */}
        <div className="bg-gradient-to-br from-neon-blue/10 to-purple-500/10 border border-neon-blue/30 rounded-lg p-2.5">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5 font-mono">
            House Balance
          </p>
          <p className="text-neon-blue text-base font-bold font-mono flex items-center gap-1.5">
            {houseBalance.toFixed(4)} <img src="/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain" /> USDC
          </p>
        </div>
        
        {/* Amount Input */}
        <div>
          <div className="relative">
            <input
              id="withdraw-amount"
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
            disabled={isLoading || houseBalance === 0}
            className="mt-1 text-[10px] text-neon-blue hover:text-cyan-400 font-mono disabled:opacity-50 transition-colors"
          >
            Withdraw Max
          </button>
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
            onClick={handleWithdraw}
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
              'Withdraw'
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

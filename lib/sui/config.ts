/**
 * Sui Network Configuration
 * 
 * This module provides centralized configuration for Sui blockchain integration.
 * It manages network settings, contract addresses, and token types.
 */

export type SuiNetwork = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export interface SuiConfig {
  network: SuiNetwork;
  rpcEndpoint: string;
  treasuryPackageId: string;
  treasuryObjectId: string;
  usdcType: string;
}

/**
 * Get Sui configuration from environment variables
 * 
 * @throws {Error} If required environment variables are missing
 * @returns {SuiConfig} The Sui configuration object
 */
export function getSuiConfig(): SuiConfig {
  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as SuiNetwork;
  const rpcEndpoint = process.env.NEXT_PUBLIC_SUI_RPC_ENDPOINT;
  const treasuryPackageId = process.env.NEXT_PUBLIC_TREASURY_PACKAGE_ID;
  const treasuryObjectId = process.env.NEXT_PUBLIC_TREASURY_OBJECT_ID;
  const usdcType = process.env.NEXT_PUBLIC_USDC_TYPE;

  // Validate required environment variables
  const missingVars: string[] = [];
  
  if (!rpcEndpoint) missingVars.push('NEXT_PUBLIC_SUI_RPC_ENDPOINT');
  if (!treasuryPackageId) missingVars.push('NEXT_PUBLIC_TREASURY_PACKAGE_ID');
  if (!treasuryObjectId) missingVars.push('NEXT_PUBLIC_TREASURY_OBJECT_ID');
  if (!usdcType) missingVars.push('NEXT_PUBLIC_USDC_TYPE');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Sui environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  return {
    network,
    rpcEndpoint: rpcEndpoint!,
    treasuryPackageId: treasuryPackageId!,
    treasuryObjectId: treasuryObjectId!,
    usdcType: usdcType!,
  };
}

/**
 * Validate that all required environment variables are present
 * Call this during application startup to fail fast if configuration is invalid
 * 
 * @throws {Error} If required environment variables are missing
 */
export function validateSuiConfig(): void {
  getSuiConfig();
}

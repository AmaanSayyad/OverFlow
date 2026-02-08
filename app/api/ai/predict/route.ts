import { NextRequest, NextResponse } from 'next/server';
import { getSuiConfig } from '@/lib/sui/config';
import { verifyPaymentProof } from '@/lib/sui/verify-payment';

const AI_INSIGHT_AMOUNT_USDC = '0.01';

/**
 * AI Prediction Route - x402-style Payment Protocol (Sui)
 *
 * Returns 402 Payment Required if no valid payment proof.
 * Client pays a small USDC deposit to treasury, then retries with Authorization: x402 <txDigest>.
 */
export async function GET(request: NextRequest) {
  let config;
  try {
    config = getSuiConfig();
  } catch (err) {
    console.error('AI predict: Sui config failed (check .env):', err);
    return NextResponse.json(
      {
        error: 'Server misconfiguration',
        hint: 'Set NEXT_PUBLIC_SUI_RPC_ENDPOINT, NEXT_PUBLIC_TREASURY_PACKAGE_ID, NEXT_PUBLIC_TREASURY_OBJECT_ID, NEXT_PUBLIC_USDC_TYPE in .env (see .env.example)',
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('Authorization');

  // 1. No authorization -> return 402 Payment Required
  if (!authHeader) {
    return NextResponse.json(
      {
        status: 402,
        message: 'Payment Required to access AI Insights',
        payment_type: 'x402',
        destination: config.treasuryObjectId,
        amount: AI_INSIGHT_AMOUNT_USDC,
        asset: 'USDC',
        memo: 'AI_INSIGHT_PREDICTION',
      },
      {
        status: 402,
        headers: {
          'WWW-Authenticate': `x402 destination="${config.treasuryObjectId}", amount="${AI_INSIGHT_AMOUNT_USDC}", asset="USDC"`,
        },
      }
    );
  }

  // 2. Verify payment proof (Sui tx digest)
  if (authHeader.startsWith('x402 ')) {
    const digest = authHeader.replace('x402 ', '').trim();

    if (digest && digest.length >= 50) {
      const sender = request.headers.get('X-Payment-Sender') ?? undefined;
      const valid = await verifyPaymentProof({ digest, sender });

      if (valid) {
        const predictions = [
          'Strong upward momentum detected. Bullish outlook for the next 30s.',
          'Market showing signs of resistance. Potential downward correction.',
          'Indicators suggest a low-volatility consolidation phase.',
          'Oversold conditions met. Statistical probability of a bounce is high.',
          'Current price action mimics a historical breakout pattern. Expect volatility UP.',
        ];
        const randomIndex = Math.floor(Math.random() * predictions.length);
        const confidence = (Math.random() * 15 + 80).toFixed(2) + '%';

        return NextResponse.json({
          success: true,
          prediction: predictions[randomIndex],
          confidence,
          txDigest: digest,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json(
    {
      error: 'Invalid Payment Proof or Unauthorized',
      hint: 'Transaction may still be indexing on testnet. Wait a few seconds and try Unlock Insight again, or ensure the wallet is on Sui Testnet.',
      status: 401,
    },
    { status: 401 }
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { getSuiConfig } from '@/lib/sui/config';
import { verifyPaymentProof } from '@/lib/sui/verify-payment';

const BLITZ_ENTRY_FEE_USDC = '0.05';

export async function GET(request: NextRequest) {
  const config = getSuiConfig();
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('x402 ')) {
    const digest = authHeader.replace('x402 ', '').trim();

    if (digest && digest.length >= 50) {
      const sender = request.headers.get('X-Payment-Sender') ?? undefined;
      const valid = await verifyPaymentProof({ digest, sender });

      if (valid) {
        return NextResponse.json({
          success: true,
          message: 'Blitz Round access granted!',
          txDigest: digest,
          expiresAt: Date.now() + 60 * 1000,
          multiplier: 2,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid payment proof' }, { status: 401 });
  }

  return NextResponse.json(
    {
      status: 402,
      message: 'Payment required for Blitz Round entry',
      destination: config.treasuryObjectId,
      amount: BLITZ_ENTRY_FEE_USDC,
      asset: 'USDC',
      network: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
      benefits: [
        '2x multipliers on all bets',
        'Access for current Blitz Round (60 seconds)',
        'Premium visual effects',
      ],
    },
    { status: 402 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txDigest } = body;

    if (txDigest && typeof txDigest === 'string' && txDigest.length >= 50) {
      const sender = body.sender ?? undefined;
      const valid = await verifyPaymentProof({ digest: txDigest, sender });

      if (valid) {
        return NextResponse.json({
          success: true,
          message: 'Blitz Round access granted!',
          txDigest,
          expiresAt: Date.now() + 60 * 1000,
          multiplier: 2,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid transaction digest' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

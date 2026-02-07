/**
 * POST /api/balance/events endpoint
 * 
 * Manages the Sui balance event listener service.
 * This endpoint can be used to start/stop the event listener or check its status.
 * 
 * Note: After Sui migration, this manages the Sui event listener for
 * deposit and withdrawal events from the treasury contract.
 */

import { NextRequest, NextResponse } from 'next/server';
import { startEventListener, stopEventListener, getEventListenerStatus } from '@/lib/sui/event-listener';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      const status = getEventListenerStatus();
      
      // Check if already listening
      if (status.isListening) {
        return NextResponse.json({
          success: false,
          message: 'Event listener is already running',
          ...status,
        });
      }

      console.log('[EventsAPI] Starting Sui balance event listener');

      // Start the event listener
      await startEventListener();

      return NextResponse.json({
        success: true,
        message: 'Sui balance event listener started successfully',
        ...getEventListenerStatus(),
      });
    } else if (action === 'stop') {
      const status = getEventListenerStatus();
      
      // Check if listener is running
      if (!status.isListening) {
        return NextResponse.json({
          success: false,
          message: 'Event listener is not running',
          ...status,
        });
      }

      console.log('[EventsAPI] Stopping Sui balance event listener');

      // Stop the event listener
      stopEventListener();

      return NextResponse.json({
        success: true,
        message: 'Sui balance event listener stopped successfully',
        ...getEventListenerStatus(),
      });
    } else if (action === 'status') {
      // Return current status
      const status = getEventListenerStatus();
      return NextResponse.json({
        success: true,
        ...status,
        message: status.isListening ? 'Event listener is running' : 'Event listener is not running',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start", "stop", or "status"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[EventsAPI] Error managing event listener:', error);
    return NextResponse.json(
      { error: 'An error occurred managing the event listener' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return current status
  const status = getEventListenerStatus();
  return NextResponse.json({
    success: true,
    ...status,
    message: status.isListening ? 'Event listener is running' : 'Event listener is not running',
  });
}

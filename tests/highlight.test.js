/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock do OBSWebSocket
vi.mock('../js/services/obs-ws.js', () => {
  return {
    default: class MockOBS {
      constructor() {}
      connect = vi.fn().mockResolvedValue({});
      disconnect = vi.fn().mockResolvedValue({});
      call = vi.fn().mockResolvedValue({});
      on = vi.fn();
    }
  };
});

// Mock do ToastManager
vi.mock('../js/components/toasts.js', () => {
  return {
    toastManager: {
      show: vi.fn()
    }
  };
});

import { obsService } from '../js/services/obsService.js';
import matchState from '../js/state.js';

describe('Highlight Integration - obsService + matchState', () => {
  beforeEach(() => {
    localStorage.clear();
    matchState.handleReset();
    obsService.reset();
    obsService.isConnected = true;
    vi.stubGlobal('window', { 
      dispatchEvent: vi.fn(),
      CustomEvent: class { constructor(n, d) { this.detail = d.detail; } }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add a HIGHLIGHT event to state when saveReplayBuffer is called', async () => {
    const addEventSpy = vi.spyOn(matchState, 'addEvent');
    
    await obsService.saveReplayBuffer();
    
    expect(addEventSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'HIGHLIGHT',
      description: expect.stringContaining('Replay de destaque salvo')
    }));
    
    const events = matchState.getState().events;
    expect(events[0].type).toBe('HIGHLIGHT');
  });

  it('should NOT add a HIGHLIGHT event if OBS is disconnected', async () => {
    obsService.isConnected = false;
    const addEventSpy = vi.spyOn(matchState, 'addEvent');
    
    await obsService.saveReplayBuffer();
    
    expect(addEventSpy).not.toHaveBeenCalled();
  });
});

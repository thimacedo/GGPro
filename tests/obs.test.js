/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { obsService } from '../js/services/obsService.js';

// Mock do OBSWebSocket (importação via CDN)
vi.mock('https://cdn.jsdelivr.net/npm/obs-websocket-js@5.0.5/+esm', () => {
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

describe('OBSService - Integration Logic', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { 
      dispatchEvent: vi.fn(),
      CustomEvent: class { constructor(n, d) { this.detail = d.detail; } }
    });
    obsService.isConnected = false;
  });

  it('should attempt to connect with default config', async () => {
    await obsService.connect();
    expect(obsService.isConnected).toBe(true);
  });

  it('should trigger scene switch on GOAL event if autoSwitch is enabled', async () => {
    obsService.isConnected = true;
    obsService.config.autoSwitch = true;
    
    const callSpy = vi.spyOn(obsService.obs, 'call');
    
    obsService.handleGameEvent({ type: 'GOAL' });
    
    expect(callSpy).toHaveBeenCalledWith('SetCurrentProgramScene', { 
      sceneName: 'CENA_GOL' 
    });
  });

  it('should trigger attack scene on high pressure', async () => {
    obsService.isConnected = true;
    obsService.config.autoSwitch = true;
    
    const callSpy = vi.spyOn(obsService.obs, 'call');
    
    obsService.handlePressureUpdate({ score: 85, dominance: 'home' });
    
    expect(callSpy).toHaveBeenCalledWith('SetCurrentProgramScene', { 
      sceneName: 'CENA_ATAQUE' 
    });
  });
});

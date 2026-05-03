/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Importamos o serviço
import { obsService } from '../js/services/obsService.js';

describe('OBSService - Replay Buffer Support', () => {
  let callSpy;

  beforeEach(() => {
    obsService.reset();
    vi.clearAllMocks();
    callSpy = vi.spyOn(obsService.obs, 'call');
  });

  it('should call ToggleReplayBuffer when toggleReplayBuffer is called', async () => {
    obsService.isConnected = true;
    
    await obsService.toggleReplayBuffer();
    
    expect(callSpy).toHaveBeenCalledWith('ToggleReplayBuffer');
  });

  it('should call SaveReplayBuffer when saveReplayBuffer is called', async () => {
    obsService.isConnected = true;
    
    await obsService.saveReplayBuffer();
    
    expect(callSpy).toHaveBeenCalledWith('SaveReplayBuffer');
  });

  it('should auto-save replay on GOAL event if autoSwitch is enabled', async () => {
    obsService.isConnected = true;
    obsService.config.autoSwitch = true;
    
    obsService.handleGameEvent({ type: 'GOAL' });
    
    expect(callSpy).toHaveBeenCalledWith('SaveReplayBuffer');
  });

  it('should not call OBS if not connected (toggle)', async () => {
    obsService.isConnected = false;
    
    await obsService.toggleReplayBuffer();
    
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('should not call OBS if not connected (save)', async () => {
    obsService.isConnected = false;
    
    await obsService.saveReplayBuffer();
    
    expect(callSpy).not.toHaveBeenCalled();
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do OBSWebSocket ANTES de importar o serviço
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

// Agora importamos o serviço que usa o mock
import { obsService } from '../js/services/obsService.js';

describe('OBSService - Integration Logic', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { 
      dispatchEvent: vi.fn(),
      CustomEvent: class { constructor(n, d) { this.detail = d.detail; } }
    });
    obsService.reset();
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

  it('should handle connection errors gracefully', async () => {
    // Forçar erro na conexão
    vi.spyOn(obsService.obs, 'connect').mockRejectedValue(new Error('Connection Failed'));
    
    await obsService.connect();
    expect(obsService.isConnected).toBe(false);
  });

  it('should handle non-existent scene switch error', async () => {
    obsService.isConnected = true;
    vi.spyOn(obsService.obs, 'call').mockRejectedValue(new Error('Scene Not Found'));
    
    // Não deve lançar erro para o sistema, apenas logar aviso
    await expect(obsService.switchScene('GHOST_SCENE')).resolves.not.toThrow();
  });

  it('should save config and attempt reconnection', async () => {
    const connectSpy = vi.spyOn(obsService, 'connect');
    
    obsService.saveConfig({ address: 'newhost:4444', password: '123', autoSwitch: true });
    
    expect(obsService.config.address).toBe('newhost:4444');
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect and reconnect if already connected during saveConfig', async () => {
    obsService.isConnected = true;
    const disconnectSpy = vi.spyOn(obsService, 'disconnect');
    const connectSpy = vi.spyOn(obsService, 'connect');

    obsService.saveConfig({ address: 'localhost:4455' });
    
    expect(disconnectSpy).toHaveBeenCalled();
    expect(connectSpy).toHaveBeenCalled();
  });
});

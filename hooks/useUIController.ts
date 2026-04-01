import { useState } from 'react';
import { Player } from '../types';

export function useUIController() {
  // Configurações Gerais
  const [activeTab, setActiveTab] = useState<'main' | 'stats'>('main');
  const [viewMode, setViewMode] = useState<'field' | 'list'>('list');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Modais de Controle
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showPenaltyStarterModal, setShowPenaltyStarterModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Modais de Edição com Contexto de Time/Jogador
  const [teamModal, setTeamModal] = useState<{isOpen: boolean, teamId: 'home'|'away'}>({isOpen: false, teamId: 'home'});
  const [coachModal, setCoachModal] = useState<{isOpen: boolean, teamId: 'home'|'away'}>({isOpen: false, teamId: 'home'});
  const [playerModal, setPlayerModal] = useState<{isOpen: boolean, teamId: 'home'|'away', player: Player | null}>({isOpen: false, teamId: 'home', player: null});
  const [importListModal, setImportListModal] = useState<{isOpen: boolean, teamId: 'home'|'away'}>({isOpen: false, teamId: 'home'});
  const [showAISelectionModal, setShowAISelectionModal] = useState(false);
  const [pendingAIResult, setPendingAIResult] = useState<any>(null);

  // Ações Rápidas - Temporárias para Modais
  const [selectedPlayerForAction, setSelectedPlayerForAction] = useState<{ player: Player, teamId: 'home' | 'away' } | null>(null);
  const [selectedTeamForAction, setSelectedTeamForAction] = useState<{ team: any, teamId: 'home' | 'away' } | null>(null);

  // Renomear Times In-line
  const [isEditingHomeName, setIsEditingHomeName] = useState(false);
  const [isEditingAwayName, setIsEditingAwayName] = useState(false);
  const [tempHomeName, setTempHomeName] = useState('');
  const [tempAwayName, setTempAwayName] = useState('');

  return {
    activeTab, setActiveTab,
    viewMode, setViewMode,
    isFullscreen, setIsFullscreen,
    isLightMode, setIsLightMode,

    showEndGameModal, setShowEndGameModal,
    showPenaltyStarterModal, setShowPenaltyStarterModal,
    showResetModal, setShowResetModal,
    isSettingsOpen, setIsSettingsOpen,
    isContextModalOpen, setIsContextModalOpen,

    teamModal, setTeamModal,
    coachModal, setCoachModal,
    playerModal, setPlayerModal,
    importListModal, setImportListModal,
    showAISelectionModal, setShowAISelectionModal,
    pendingAIResult, setPendingAIResult,

    selectedPlayerForAction, setSelectedPlayerForAction,
    selectedTeamForAction, setSelectedTeamForAction,

    isEditingHomeName, setIsEditingHomeName,
    isEditingAwayName, setIsEditingAwayName,
    tempHomeName, setTempHomeName,
    tempAwayName, setTempAwayName,
  };
}

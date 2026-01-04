'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppRegistry } from '@/core/registry/AppRegistry';
import { AppBlueprint, Page } from '@/core/blueprint/AppBlueprint';
import { Command } from '@/core/command/CommandTypes';
import { IntentAnalyzer, IntentResult, IntentSuggestion } from '@/core/intent/IntentAnalyzer';
import { voiceCore } from '@/core/voice/VoiceCore';
import React, { useEffect, useState } from 'react';

export default function AppPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [app, setApp] = useState<AppBlueprint | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [commandInput, setCommandInput] = useState('');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const loadedApp = AppRegistry.getApp(id);
    if (!loadedApp) {
      router.push('/');
      return;
    }
    console.log('[Preview] Loaded app:', loadedApp.id);
    console.log('[Preview] Pages array:', loadedApp.pages);
    console.log('[Preview] Pages length:', loadedApp.pages?.length || 0);
    setApp(loadedApp);
    setPreviewMode(loadedApp.layout.previewMode);
    
    // Set first page as active if pages exist
    if (loadedApp.pages && loadedApp.pages.length > 0 && !activePageId) {
      setActivePageId(loadedApp.pages[0].id);
    }
  }, [id, router]);
  
  // Update active page when pages are added
  useEffect(() => {
    if (app && app.pages && app.pages.length > 0) {
      // If no active page or active page doesn't exist, set to first page
      if (!activePageId || !app.pages.find(p => p.id === activePageId)) {
        setActivePageId(app.pages[0].id);
      }
    }
  }, [app?.pages, activePageId]);

  // Execute command and apply changes to blueprint
  const executeCommand = (command: Command, currentApp: AppBlueprint): { updatedApp: AppBlueprint | null; newActivePageId?: string } | null => {
    if (!currentApp) return null;

    switch (command.type) {
      case 'ADD_PAGE': {
        const { pageName } = command.payload;
        const newPage: Page = {
          id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: pageName,
          title: pageName,
          path: `/${pageName.toLowerCase().replace(/\s+/g, '-')}`,
          content: `This is the ${pageName} page.`,
          components: [],
        };

        const updatedPages = [...currentApp.pages, newPage];
        const updatedApp = AppRegistry.updateApp(currentApp.id, {
          pages: updatedPages,
        });

        if (updatedApp) {
          console.log('[Preview] Added new page:', newPage);
          return { updatedApp, newActivePageId: newPage.id };
        }
        return null;
      }

      case 'RENAME_PAGE': {
        const { oldName, newName } = command.payload;
        const oldNameLower = oldName.toLowerCase();
        
        const pageIndex = currentApp.pages.findIndex(
          p => p.name.toLowerCase() === oldNameLower || p.title.toLowerCase() === oldNameLower
        );
        
        if (pageIndex >= 0) {
          const updatedPages = [...currentApp.pages];
          updatedPages[pageIndex] = {
            ...updatedPages[pageIndex],
            name: newName,
            title: newName,
            path: `/${newName.toLowerCase().replace(/\s+/g, '-')}`,
          };
          
          const updatedApp = AppRegistry.updateApp(currentApp.id, {
            pages: updatedPages,
          });

          if (updatedApp) {
            console.log('[Preview] Renamed page:', oldName, 'to', newName);
            return { updatedApp };
          } else {
            console.log('[Preview] Failed to save renamed page');
          }
        } else {
          console.log('[Preview] Page not found:', oldName);
        }
        return null;
      }

      case 'DELETE_PAGE': {
        const { pageName } = command.payload;
        const pageNameLower = pageName.toLowerCase();
        
        // Prevent deletion if it's the last page
        if (currentApp.pages.length <= 1) {
          console.log('[Preview] Cannot delete last page');
          return null;
        }
        
        const pageIndex = currentApp.pages.findIndex(
          p => p.name.toLowerCase() === pageNameLower || p.title.toLowerCase() === pageNameLower
        );
        
        if (pageIndex >= 0) {
          const pageToDelete = currentApp.pages[pageIndex];
          const updatedPages = currentApp.pages.filter((_, index) => index !== pageIndex);
          
          const updatedApp = AppRegistry.updateApp(currentApp.id, {
            pages: updatedPages,
          });

          if (updatedApp) {
            // If deleted page was active, switch to first page
            const newActivePageId = activePageId === pageToDelete.id ? updatedPages[0].id : undefined;
            console.log('[Preview] Deleted page:', pageName);
            return { updatedApp, newActivePageId };
          } else {
            console.log('[Preview] Failed to save deleted page');
          }
        } else {
          console.log('[Preview] Page not found:', pageName);
        }
        return null;
      }

      default:
        return null;
    }
  };

  // Subscribe to voice transcripts
  useEffect(() => {
    if (!app) return;

    const unsubscribe = voiceCore.onTranscript((transcript) => {
      if (transcript.isFinal) {
        setCommandInput(transcript.text);
        setIsListening(false);
        voiceCore.stopListening();
        
        // Process transcript through IntentAnalyzer (same as typing)
        const context = {
          currentPages: app.pages.map(p => p.name),
          appName: app.name,
        };
        const intentResult = IntentAnalyzer.analyzeIntent(transcript.text, context);
        setIntentResult(intentResult);
        
        // Execute commands only when mode is "direct" and commands exist
        if (intentResult.mode === 'direct' && intentResult.commands.length > 0) {
          for (const cmd of intentResult.commands) {
            const result = executeCommand(cmd, app);
            if (result && result.updatedApp) {
              setApp(result.updatedApp);
              if (result.newActivePageId) {
                setActivePageId(result.newActivePageId);
              }
              
              // Voice output confirmation
              let confirmationText = '';
              if (cmd.type === 'ADD_PAGE') {
                confirmationText = `Page ${cmd.payload.pageName} added`;
              } else if (cmd.type === 'RENAME_PAGE') {
                confirmationText = `Page renamed from ${cmd.payload.oldName} to ${cmd.payload.newName}`;
              } else if (cmd.type === 'DELETE_PAGE') {
                confirmationText = `Page ${cmd.payload.pageName} deleted`;
              }
              
              if (confirmationText) {
                voiceCore.speak(confirmationText);
              }
            }
          }
          setCommandInput('');
          setIntentResult(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [app, activePageId]);

  const handleModeToggle = (mode: 'desktop' | 'mobile') => {
    setPreviewMode(mode);
    if (app) {
      AppRegistry.updateApp(app.id, {
        layout: {
          ...app.layout,
          previewMode: mode,
        },
      });
      setApp(AppRegistry.getApp(app.id));
    }
  };

  const handleCommandSubmit = (command: string) => {
    if (!app) {
      console.log('[Preview] Cannot process command: app not loaded');
      return;
    }

    console.log('[Preview] Processing command:', command);
    
    // Analyze intent using IntentAnalyzer
    const context = {
      currentPages: app.pages.map(p => p.name),
      appName: app.name,
    };
    
    const intentResult = IntentAnalyzer.analyzeIntent(command, context);
    setIntentResult(intentResult);
    
    // Execute commands only when mode is "direct" and commands exist
    if (intentResult.mode === 'direct' && intentResult.commands.length > 0) {
      for (const cmd of intentResult.commands) {
        const result = executeCommand(cmd, app);
        if (result && result.updatedApp) {
          setApp(result.updatedApp);
          if (result.newActivePageId) {
            setActivePageId(result.newActivePageId);
          }
          
          // Voice output confirmation
          let confirmationText = '';
          if (cmd.type === 'ADD_PAGE') {
            confirmationText = `Page ${cmd.payload.pageName} added`;
          } else if (cmd.type === 'RENAME_PAGE') {
            confirmationText = `Page renamed from ${cmd.payload.oldName} to ${cmd.payload.newName}`;
          } else if (cmd.type === 'DELETE_PAGE') {
            confirmationText = `Page ${cmd.payload.pageName} deleted`;
          }
          
          if (confirmationText) {
            voiceCore.speak(confirmationText);
          }
        }
      }
      // Clear input and intent result after successful execution
      setCommandInput('');
      setIntentResult(null);
    }
    // For vague/unknown modes, keep the intent result to show suggestions
  };

  const handleMicClick = () => {
    if (isListening) {
      voiceCore.stopListening();
      setIsListening(false);
    } else {
      voiceCore.startListening('preview');
      setIsListening(true);
    }
  };

  const handleSuggestionClick = (suggestion: IntentSuggestion) => {
    setCommandInput(suggestion.command);
    handleCommandSubmit(suggestion.command);
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commandInput.trim()) {
      handleCommandSubmit(commandInput);
      // Input clearing is handled in handleCommandSubmit for direct commands
      // For vague/unknown, we keep the input to show suggestions
    }
  };

  if (!app) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        backgroundColor: '#0a1128',
        color: '#fff',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  const previewWidth = previewMode === 'mobile' ? 375 : 1920;
  const previewHeight = previewMode === 'mobile' ? 667 : 1080;

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: '#0a1128'
    }}>
      {/* Main Preview Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#0a1128'
      }}>
        {/* Preview Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #2d3a5a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0a1128',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: 'transparent',
                border: '1px solid #2d3a5a',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#fff',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.backgroundColor = '#141b33';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2d3a5a';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{app.name}</h1>
          </div>
          
          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '4px',
            backgroundColor: '#141b33',
            borderRadius: '8px',
            border: '1px solid #2d3a5a',
          }}>
            <button
              onClick={() => handleModeToggle('desktop')}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: 500,
                background: previewMode === 'desktop' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' 
                  : 'transparent',
                color: previewMode === 'desktop' ? '#fff' : '#b4b8d0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Desktop
            </button>
            <button
              onClick={() => handleModeToggle('mobile')}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: 500,
                background: previewMode === 'mobile' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' 
                  : 'transparent',
                color: previewMode === 'mobile' ? '#fff' : '#b4b8d0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Mobile
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'auto',
          backgroundColor: '#0a1128',
        }}>
          <div
            style={{
              width: previewMode === 'mobile' ? `${previewWidth}px` : '100%',
              height: previewMode === 'mobile' ? `${previewHeight}px` : '100%',
              maxWidth: previewMode === 'mobile' ? `${previewWidth}px` : 'none',
              maxHeight: previewMode === 'mobile' ? `${previewHeight}px` : 'none',
              backgroundColor: '#fff',
              borderRadius: previewMode === 'mobile' ? '12px' : '0',
              boxShadow: previewMode === 'mobile' ? '0 4px 24px rgba(0,0,0,0.1)' : 'none',
              overflow: 'auto',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Page Navigation Tabs */}
            {app.pages && app.pages.length > 0 && (
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa',
                padding: '0 16px',
                gap: '8px',
                overflowX: 'auto',
              }}>
                {app.pages.map((page) => {
                  const isActive = activePageId === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => setActivePageId(page.id)}
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: isActive ? 600 : 400,
                        border: 'none',
                        borderBottom: isActive ? '2px solid #667eea' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: isActive ? '#667eea' : '#6c757d',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#495057';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#6c757d';
                        }
                      }}
                    >
                      {page.title || page.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preview Content - rendered from blueprint */}
            {(() => {
              const hasPages = app.pages && Array.isArray(app.pages) && app.pages.length > 0;
              console.log('[Preview] Rendering. Has pages:', hasPages, 'Pages:', app.pages);
              
              if (!hasPages) {
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999',
                    fontSize: '16px',
                  }}>
                    No pages yet. Add pages to see them here.
                  </div>
                );
              }
              
              const activePage = app.pages.find(p => p.id === activePageId);
              
              if (!activePage) {
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999',
                    fontSize: '16px',
                  }}>
                    Select a page to view
                  </div>
                );
              }
              
              console.log('[Preview] Rendering active page:', activePage.id, activePage.title || activePage.name);
              
              return (
                <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', flex: 1 }}>
                  <div style={{ width: '100%' }}>
                    <h1 style={{ 
                      fontSize: '36px', 
                      fontWeight: 700, 
                      marginBottom: '24px', 
                      color: '#1a1a1a',
                      lineHeight: '1.2',
                    }}>
                      {activePage.title || activePage.name}
                    </h1>
                    {activePage.content && (
                      <div style={{
                        marginBottom: '32px',
                        padding: '24px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef',
                      }}>
                        <p style={{ 
                          fontSize: '18px', 
                          color: '#495057',
                          lineHeight: '1.6',
                          margin: 0,
                        }}>
                          {activePage.content}
                        </p>
                      </div>
                    )}
                    <div style={{
                      marginTop: '32px',
                      padding: '32px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '2px dashed #dee2e6',
                      textAlign: 'center',
                    }}>
                      <p style={{ 
                        fontSize: '16px', 
                        color: '#6c757d',
                        margin: 0,
                      }}>
                        Content placeholder
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div style={{
        width: '320px',
        borderLeft: '1px solid #2d3a5a',
        backgroundColor: '#141b33',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2d3a5a',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Commands</h2>
        </div>
        <div style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter command..."
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                setIntentResult(null); // Clear previous results when typing
              }}
              onKeyDown={handleCommandKeyDown}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #2d3a5a',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#0a1128',
                color: '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#2d3a5a'}
            />
            <button
              onClick={handleMicClick}
              style={{
                padding: '12px',
                fontSize: '16px',
                backgroundColor: isListening ? '#ef4444' : 'transparent',
                color: isListening ? '#fff' : '#667eea',
                border: `1px solid ${isListening ? '#ef4444' : '#667eea'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '44px',
              }}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              🎤
            </button>
          </div>
          
          {/* Intent Result Display */}
          {intentResult && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {intentResult.message && (
                <p style={{
                  fontSize: '13px',
                  color: '#b4b8d0',
                  margin: 0,
                }}>
                  {intentResult.message}
                </p>
              )}
              
              {intentResult.suggestions && intentResult.suggestions.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {intentResult.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        backgroundColor: '#0a1128',
                        color: '#667eea',
                        border: '1px solid #667eea',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#667eea';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#0a1128';
                        e.currentTarget.style.color = '#667eea';
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


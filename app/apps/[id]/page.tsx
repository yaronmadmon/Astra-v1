'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppRegistry } from '@/core/registry/AppRegistry';
import { AppBlueprint, Page } from '@/core/blueprint/AppBlueprint';
import React, { useEffect, useState } from 'react';

// Command types
type CommandType = 'ADD_PAGE' | 'RENAME_PAGE' | 'DELETE_PAGE';

interface AddPageCommand {
  type: 'ADD_PAGE';
  payload: {
    pageName: string;
  };
}

interface RenamePageCommand {
  type: 'RENAME_PAGE';
  payload: {
    oldName: string;
    newName: string;
  };
}

interface DeletePageCommand {
  type: 'DELETE_PAGE';
  payload: {
    pageName: string;
  };
}

type Command = AddPageCommand | RenamePageCommand | DeletePageCommand;

export default function AppPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [app, setApp] = useState<AppBlueprint | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [commandInput, setCommandInput] = useState('');
  const [activePageId, setActivePageId] = useState<string | null>(null);

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

  // Parse raw command text into structured Command object
  const parseCommand = (commandText: string): Command | null => {
    const trimmedCommand = commandText.trim().toLowerCase();
    const originalCommand = commandText.trim();
    
    // Parse "add page <PageName>"
    if (trimmedCommand.startsWith('add page ')) {
      const pageName = originalCommand.substring(9).trim();
      if (pageName) {
        return {
          type: 'ADD_PAGE',
          payload: { pageName },
        };
      }
    }
    // Parse "rename page <OldName> to <NewName>"
    else if (trimmedCommand.startsWith('rename page ') && trimmedCommand.includes(' to ')) {
      const originalLower = originalCommand.toLowerCase();
      const toIndex = originalLower.indexOf(' to ', 12);
      
      if (toIndex > 12) {
        const oldName = originalCommand.substring(12, toIndex).trim();
        const newName = originalCommand.substring(toIndex + 4).trim();
        
        if (oldName && newName) {
          return {
            type: 'RENAME_PAGE',
            payload: { oldName, newName },
          };
        }
      }
    }
    // Parse "delete page <PageName>"
    else if (trimmedCommand.startsWith('delete page ')) {
      const pageName = originalCommand.substring(12).trim();
      if (pageName) {
        return {
          type: 'DELETE_PAGE',
          payload: { pageName },
        };
      }
    }
    
    return null;
  };

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

  const handleCommandSubmit = (command: string) => {
    if (!app) {
      console.log('[Preview] Cannot process command: app not loaded');
      return;
    }

    console.log('[Preview] Processing command:', command);
    
    // Parse command text into structured Command object
    const parsedCommand = parseCommand(command);
    
    if (!parsedCommand) {
      console.log('[Preview] Command not recognized:', command);
      console.log('[Preview] Available commands: "add page <name>", "rename page <old> to <new>", "delete page <name>"');
      return;
    }

    // Execute command and get result
    const result = executeCommand(parsedCommand, app);
    
    if (result && result.updatedApp) {
      setApp(result.updatedApp);
      if (result.newActivePageId) {
        setActivePageId(result.newActivePageId);
      }
    }
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commandInput.trim()) {
      handleCommandSubmit(commandInput);
      setCommandInput('');
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
        }}>
          <input
            type="text"
            placeholder="Commands: 'add page About', 'rename page Home to Welcome', 'delete page About'"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleCommandKeyDown}
            style={{
              width: '100%',
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
        </div>
      </div>
    </div>
  );
}


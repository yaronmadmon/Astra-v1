'use client';

import { useRouter } from 'next/navigation';
import { AppRegistry } from '@/core/registry/AppRegistry';
import { AppBlueprint } from '@/core/blueprint/AppBlueprint';
import React, { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [apps, setApps] = useState<AppBlueprint[]>([]);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    setApps(AppRegistry.listApps());
  }, []);

  const handleCreateApp = () => {
    const newApp = AppRegistry.createApp();
    router.push(`/apps/${newApp.id}`);
  };

  const handleDeleteApp = (appId: string, appName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (window.confirm(`Are you sure you want to delete "${appName}"? This action cannot be undone.`)) {
      const deleted = AppRegistry.deleteApp(appId);
      if (deleted) {
        setApps(AppRegistry.listApps());
      }
    }
  };

  const handleRenameApp = (appId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    const newName = window.prompt('Rename app:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      const updatedApp = AppRegistry.updateApp(appId, {
        name: newName.trim(),
      });
      if (updatedApp) {
        setApps(AppRegistry.listApps());
      }
    }
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '48px 24px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#0a1128',
    }}>
      <div style={{ marginBottom: '48px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
              animation: 'shimmer 3s ease-in-out infinite',
            }} />
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <path 
                d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z" 
                fill="white" 
                opacity="0.95"
              />
              <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8" />
              <circle cx="8" cy="8" r="0.8" fill="white" opacity="0.6" />
              <circle cx="16" cy="8" r="0.8" fill="white" opacity="0.6" />
              <circle cx="8" cy="16" r="0.8" fill="white" opacity="0.6" />
              <circle cx="16" cy="16" r="0.8" fill="white" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 style={{ 
              fontSize: '44px', 
              fontWeight: 800, 
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              lineHeight: '1.1',
              animation: 'gradientShift 4s ease infinite',
              textShadow: '0 0 40px rgba(102, 126, 234, 0.2)',
            }}>
              ASTRA
            </h1>
            <div style={{
              height: '3px',
              width: '100px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              borderRadius: '2px',
              marginTop: '4px',
              opacity: 0.6,
            }} />
          </div>
        </div>
        <p style={{ 
          fontSize: '18px', 
          color: '#b4b8d0',
          marginBottom: '32px'
        }}>
          AI-first app and web builder
        </p>
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter text..."
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '12px 16px',
            fontSize: '16px',
            border: '1px solid #2d3a5a',
            borderRadius: '8px',
            outline: 'none',
            marginBottom: '24px',
            transition: 'border-color 0.2s',
            backgroundColor: '#141b33',
            color: '#fff',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#2d3a5a'}
        />
        <button
          onClick={handleCreateApp}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 500,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Create App
        </button>
      </div>

      <div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 600, 
          marginBottom: '24px',
          color: '#fff',
        }}>
          My Apps
        </h2>
        {apps.length === 0 ? (
          <p style={{ color: '#7c82a0', fontSize: '16px' }}>
            No apps yet. Create your first app to get started.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {apps.map((app) => (
              <div
                key={app.id}
                onClick={() => router.push(`/apps/${app.id}`)}
                style={{
                  padding: '24px',
                  border: '1px solid #2d3a5a',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: '#141b33',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2d3a5a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px',
                }}>
                  <button
                    onClick={(e) => handleRenameApp(app.id, app.name, e)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'transparent',
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
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#667eea';
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => handleDeleteApp(app.id, app.name, e)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ef4444';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    Delete
                  </button>
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 700, 
                  marginBottom: '8px',
                  color: '#fff',
                  paddingRight: '120px', // Make room for buttons
                }}>
                  {app.name}
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#b4b8d0',
                  marginBottom: '12px'
                }}>
                  {app.pages.length} {app.pages.length === 1 ? 'page' : 'pages'}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#7c82a0' 
                }}>
                  Updated {new Date(app.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


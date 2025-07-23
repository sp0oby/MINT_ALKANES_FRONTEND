import React, { useState } from 'react';
import { useLaserEyes } from '@omnisat/lasereyes-react';
import { UNISAT, OYL } from '@omnisat/lasereyes-core';

interface WalletOption {
  id: string;
  name: string;
  icon?: string;
  description: string;
  isAvailable: boolean;
}

const WalletSelector: React.FC = () => {
  const {
    connect,
    disconnect,
    connected,
    address,
    provider,
    hasUnisat,
    hasOyl
  } = useLaserEyes();

  const [showWalletList, setShowWalletList] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const wallets: WalletOption[] = [
    {
      id: OYL,
      name: 'OYL',
      description: 'Bitcoin wallet focused on Ordinals',
      isAvailable: hasOyl
    },
    {
      id: UNISAT,
      name: 'UniSat',
      description: 'Popular Bitcoin and Ordinals wallet',
      isAvailable: hasUnisat
    }
  ];

  const availableWallets = wallets.filter(wallet => wallet.isAvailable);
  const unavailableWallets = wallets.filter(wallet => !wallet.isAvailable);

  const handleWalletConnect = async (walletId: string) => {
    try {
      setConnecting(walletId);
      await connect(walletId as any);
      setShowWalletList(false);
    } catch (error) {
      console.error(`Failed to connect to ${walletId}:`, error);
      alert(`Failed to connect to ${walletId}: ${error}`);
    } finally {
      setConnecting(null);
    }
  };

  const getWalletInstallUrl = (walletId: string) => {
    const urls: Record<string, string> = {
      [UNISAT]: 'https://unisat.io',
      [OYL]: 'https://www.oyl.io'
    };
    return urls[walletId] || '#';
  };

  if (connected) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.9), rgba(33, 150, 243, 0.8))',
        padding: '1rem 1.5rem',
        borderRadius: '15px',
        color: 'white',
        fontSize: 'clamp(0.8rem, 2vw, 1rem)',
        fontFamily: 'Wire, Arial, sans-serif',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(255, 182, 193, 0.3)',
        transform: 'translateZ(0)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#90EE90',
            boxShadow: '0 0 10px #90EE90',
            animation: 'pulse 2s infinite'
          }}></div>
          <span style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
            <img src="/favicon.ico" alt="Love Bomb" style={{ width: '16px', height: '16px', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            CONNECTED ({provider?.toUpperCase()})
          </span>
        </div>
        <p style={{ margin: '0 0 0.5rem 0', fontFamily: 'monospace', color: '#FFFFFF' }}>
          {address?.slice(0, 8)}...{address?.slice(-6)}
        </p>
        <button 
          onClick={disconnect}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontFamily: 'Wire, Arial, sans-serif',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.15), rgba(33, 150, 243, 0.15))',
          padding: '1rem 1.5rem',
          borderRadius: '15px',
          color: '#FFB6C1',
          fontSize: 'clamp(0.8rem, 2vw, 1rem)',
          fontFamily: 'Wire, Arial, sans-serif',
          border: '2px solid rgba(255, 182, 193, 0.3)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(255, 182, 193, 0.2)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setShowWalletList(!showWalletList)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 182, 193, 0.25), rgba(33, 150, 243, 0.25))';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'rgba(255, 182, 193, 0.5)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 182, 193, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 182, 193, 0.15), rgba(33, 150, 243, 0.15))';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255, 182, 193, 0.3)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 182, 193, 0.2)';
        }}
      >
        <div style={{
          marginBottom: '0.5rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img src="/favicon.ico" alt="Love Bomb" style={{ width: '24px', height: '24px' }} />
        </div>
        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem', color: '#FFB6C1' }}>
          CONNECT WALLET
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, color: '#FFFFFF' }}>
          {availableWallets.length} wallet{availableWallets.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Wallet Selection Dropdown */}
      {showWalletList && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 182, 193, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          minWidth: '280px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {/* Available Wallets */}
          {availableWallets.length > 0 && (
            <div style={{ padding: '1rem' }}>
              <h4 style={{ 
                margin: '0 0 0.5rem 0', 
                color: '#90EE90', 
                fontSize: '0.9rem',
                fontFamily: 'Wire, Arial, sans-serif'
              }}>
                Available Wallets
              </h4>
              {availableWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletConnect(wallet.id)}
                  disabled={connecting === wallet.id}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: connecting === wallet.id ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    color: 'white',
                    cursor: connecting === wallet.id ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (connecting !== wallet.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (connecting !== wallet.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>
                    {connecting === wallet.id ? 'Connecting...' : wallet.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {wallet.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Unavailable Wallets */}
          {unavailableWallets.length > 0 && (
            <div style={{ padding: '1rem', borderTop: availableWallets.length > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ 
                margin: '0 0 0.5rem 0', 
                color: '#ff6b6b', 
                fontSize: '0.9rem',
                fontFamily: 'Wire, Arial, sans-serif'
              }}>
                Install Wallets
              </h4>
              {unavailableWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => window.open(getWalletInstallUrl(wallet.id), '_blank')}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>
                    Install {wallet.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {wallet.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Close button */}
          <div style={{ padding: '0.5rem 1rem' }}>
            <button
              onClick={() => setShowWalletList(false)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'Wire, Arial, sans-serif'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSelector; 
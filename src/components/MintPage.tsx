import React, { useEffect, useRef, useState } from 'react';
import { LaserEyesProvider, useLaserEyes } from '@omnisat/lasereyes-react';
import { MAINNET } from '@omnisat/lasereyes-core';
import { gsap } from 'gsap';
import WalletSelector from './WalletSelector';

// Constants for minting (from environment variables)
const ALKANE_ID = { 
  block: Number(import.meta.env.VITE_ALKANE_BLOCK) || 2, 
  tx: Number(import.meta.env.VITE_ALKANE_TX) || 50169
};
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Add type declaration for Oyl window object
declare global {
  interface Window {
    oyl: {
      request: (args: { 
        method: string; 
        params: any[];
      }) => Promise<any>;
    };
  }
}

// Import SVGs
import mintBitcoin from '../assets/mint-bitcoin.svg';
import mintOyl from '../assets/mint-oyl.svg';
import mintGet from '../assets/mint-get.svg';
import mintBomb from '../assets/mint-bomb.svg';
import mintSuccess from '../assets/mint-success.svg';
import bomb8 from '../assets/bomb8.svg';
import plane from '../assets/plane.svg';

// Remove unused UTXO interface

const MintContent: React.FC = () => {
  const {
    connected,
    address,
    paymentAddress,
    balance,
    provider,
    signPsbt,
    getBalance,
    publicKey,
    paymentPublicKey
  } = useLaserEyes();

  // Refs for each bomb
  const bitcoinRef = useRef<HTMLImageElement | null>(null);
  const oylRef = useRef<HTMLImageElement | null>(null);
  const getRef = useRef<HTMLImageElement | null>(null);
  const bombRef = useRef<HTMLImageElement | null>(null);
  const successRef = useRef<HTMLImageElement | null>(null);
  const bomb8Ref = useRef<HTMLImageElement | null>(null);

  // Mint state
  const [mintState, setMintState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mintError, setMintError] = useState<string | undefined>(undefined);
  const [showSuccessElements, setShowSuccessElements] = useState(false);
  const [showBomb8, setShowBomb8] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | undefined>(undefined);
  const [showSegwitInstructions, setShowSegwitInstructions] = useState(false);

  
  // Track which bombs have been dropped
  const [droppedBombs, setDroppedBombs] = useState<Set<string>>(new Set());

  // Fetch wallet balance when connected
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (connected && address) {
        console.log('Wallet connected:', { 
          taprootAddress: address, 
          segwitAddress: paymentAddress,
          balance, 
          connected 
        });

        try {
          // Try to get balance from Laser Eyes first
          if (balance !== undefined && balance > 0) {
            console.log('Using balance from hook:', balance);
            setWalletBalance(balance);
          } else if (getBalance) {
            console.log('Fetching balance with getBalance...');
            const fetchedBalance = await getBalance();
            console.log('Fetched balance:', fetchedBalance);
            setWalletBalance(typeof fetchedBalance === 'string' ? Number.parseInt(fetchedBalance) : fetchedBalance);
          } else {
            console.log('No balance available, fetching manually from API...');
            // Fallback: fetch balance manually from Bitcoin API
            // Use paymentAddress (Segwit) for balance check
            const addressToCheck = paymentAddress || address;
            const response = await fetch(`https://blockstream.info/api/address/${addressToCheck}`);
            if (response.ok) {
              const data = await response.json();
              const balanceInSats = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
              console.log('Manual balance fetch result:', balanceInSats);
              setWalletBalance(balanceInSats);
            }
          }
        } catch (error) {
          console.error('Failed to fetch wallet balance:', error);
          setWalletBalance(0);
        } finally {
          // Loading state removed
        }
      } else {
        console.log('Wallet not connected, clearing balance');
        setWalletBalance(undefined);
      }
    };

    fetchWalletBalance();
  }, [connected, address, paymentAddress, balance, getBalance]);

  // Show loading modal when minting
  useEffect(() => {
    if (mintState === 'loading') {
      // Show loading state in UI if needed
    } else if (mintState === 'success') {
      // Show success elements instead of modal
      setShowSuccessElements(true);
      setShowBomb8(true);
    } else if (mintState === 'error') {
      // Show error state in UI if needed
      console.error('Mint error:', mintError);
    }
  }, [mintState, mintError]);

  // Segwit instructions modal
  const SegwitInstructionsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        transition: 'opacity 0.3s',
      }}>
        <div style={{
          background: 'rgba(30,30,30,0.98)',
          borderRadius: 16,
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          boxShadow: '0 0 32px #000',
          minWidth: 320,
          maxWidth: '90vw',
          textAlign: 'left',
        }}>
          <h2 style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '2rem', color: '#FFB6C1', marginBottom: '1rem', textAlign: 'center' }}>
            How to Use Segwit Addresses
          </h2>
          
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '1.1rem', color: '#fff', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            <p>Your wallet is currently using a Taproot address (starts with bc1p), but this app requires a Segwit address (starts with bc1q).</p>
            
            <h3 style={{ color: '#90EE90', marginTop: '1.5rem', marginBottom: '0.5rem' }}>To get a Segwit address:</h3>
            
            <ol style={{ paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.8rem' }}>Disconnect your wallet from this app</li>
              <li style={{ marginBottom: '0.8rem' }}>Open the OYL wallet extension</li>
              <li style={{ marginBottom: '0.8rem' }}>Go to Settings → Advanced</li>
              <li style={{ marginBottom: '0.8rem' }}>Change "Default Address Type" to "Segwit (P2WPKH)"</li>
              <li style={{ marginBottom: '0.8rem' }}>Reconnect your wallet to this app</li>
            </ol>
            
            <p style={{ marginTop: '1.5rem' }}>If your wallet doesn't support changing address types, try using a different wallet that supports Segwit addresses.</p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button onClick={onClose} style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '1.2rem', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 2rem', cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleMintClick = async () => {
    console.log('=== STARTING MINT PROCESS ===');
    setMintError(undefined);
    setMintState('loading');

    if (!connected) {
      setMintError('Please connect a wallet first by clicking the "CONNECT WALLET" button in the top right corner.');
      setMintState('error');
      return;
    }

    if (!address) {
      setMintError('No wallet address found');
      setMintState('error');
      return;
    }

    // Use paymentAddress (Segwit) for UTXO fetching
    const utxoAddress = paymentAddress || address;
    console.log('Wallet addresses:', { 
      taprootAddress: address,
      segwitAddress: paymentAddress,
      usingForUtxos: utxoAddress 
    });

    // Check balance (use manually fetched balance or fallback to hook balance)
    const currentBalance = walletBalance ?? balance ?? 0;
    const btcBalance = currentBalance / 100000000;
    const feeRate = 1; // Lower fee rate (1 sat/vB)
    const estimatedTxSize = 200; // bytes
    const estimatedFeeSats = feeRate * estimatedTxSize;
    const estimatedFeesBTC = estimatedFeeSats / 100000000;

    console.log('Balance check:', {
      walletBalance,
      hookBalance: balance,
      currentBalance,
      btcBalance,
      estimatedFeeSats,
      estimatedFeesBTC
    });

    if (currentBalance < estimatedFeeSats) {
      setMintError(`Insufficient balance for transaction fees. You have ${btcBalance.toFixed(8)} BTC (${currentBalance.toLocaleString()} sats), need ${estimatedFeesBTC.toFixed(8)} BTC (${estimatedFeeSats} sats) for fees.`);
      setMintState('error');
      return;
    }

    // Drop all other bombs first
    dropAllBombs();
    
    handleBombDrop(bombRef, 'mint', async () => {
      try {
        console.log('Creating alkanes execute transaction...');

        // Create alkanes execute call for Love Bombs minting
        const executeData = {
          alkaneId: { block: ALKANE_ID.block.toString(), tx: ALKANE_ID.tx.toString() },
          opcode: 77,
          calldata: []
        };

        console.log('Execute data:', executeData);

        // Create PSBT using our API
        console.log('Calling API to create PSBT...');
        
        // Use the appropriate public key based on the address type
        const walletPublicKey = utxoAddress.startsWith('bc1q') ? paymentPublicKey : publicKey;
        console.log('Using wallet public key:', walletPublicKey ? walletPublicKey.slice(0, 10) + '...' : 'none');
        
        // Fee configuration from environment variables
        const feeConfig = import.meta.env.VITE_FEE_ADDRESS ? {
          address: import.meta.env.VITE_FEE_ADDRESS,
          amount: Number(import.meta.env.VITE_FEE_AMOUNT) || 1000
        } : null;
        
        const response = await fetch(`${API_URL}/api/alkanes/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address: utxoAddress,  // Segwit address for UTXO fetching
            taprootAddress: address,  // Taproot address for alkane token outputs
            executeData,
            feeRate: Number(import.meta.env.VITE_DEFAULT_FEE_RATE) || 1,
            walletPublicKey: walletPublicKey, // Pass the wallet's public key
            feeConfig: feeConfig // Add fee configuration
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create PSBT');
        }

        const data = await response.json();
        const { psbt, estimatedFee, serviceFee, totalAvailable, changeAmount } = data;
        
        console.log('PSBT received from API with details:', {
          estimatedFee,
          serviceFee,
          totalAvailable,
          changeAmount,
          feePct: ((estimatedFee / totalAvailable) * 100).toFixed(2) + '%',
          servicePct: serviceFee ? ((serviceFee / totalAvailable) * 100).toFixed(2) + '%' : '0%'
        });

        // Sign the PSBT with Laser Eyes
        console.log('Requesting signature...');
        console.log('PSBT is using Segwit inputs from:', utxoAddress);
        console.log('Alkane tokens will go to Taproot address:', address);
        console.log('Wallet public keys:', { publicKey: publicKey?.slice(0, 10) + '...', paymentPublicKey: paymentPublicKey?.slice(0, 10) + '...' });
        
        try {
          // The wallet needs to sign with the Segwit key since inputs are from Segwit address
          // Try signing with explicit options for better compatibility
          const signedPsbtResponse = await signPsbt(psbt, true, false); // finalize=true, broadcast=false
          console.log('Signature response received:', typeof signedPsbtResponse);

          // Extract the signed PSBT hex
          let signedPsbtHex: string;
          if (typeof signedPsbtResponse === 'string') {
            signedPsbtHex = signedPsbtResponse;
            console.log('Signature is a string, length:', signedPsbtHex.length);
          } else if (signedPsbtResponse && 'signedPsbtHex' in signedPsbtResponse && signedPsbtResponse.signedPsbtHex) {
            signedPsbtHex = signedPsbtResponse.signedPsbtHex;
            console.log('Signature is an object with signedPsbtHex property, length:', signedPsbtHex.length);
          } else {
            console.error('Invalid signature response:', signedPsbtResponse);
            throw new Error('Invalid signed PSBT response - no signedPsbtHex found');
          }

          // Debug: Check if PSBT was properly signed
          console.log('Signed PSBT preview:', signedPsbtHex.substring(0, 100) + '...');
          
          // Try to parse and inspect the signed PSBT
          try {
            // Check if it's base64 or hex
            const isBase64 = signedPsbtHex.includes('+') || signedPsbtHex.includes('/') || signedPsbtHex.includes('=');
            console.log('Signed PSBT format:', isBase64 ? 'base64' : 'hex');
          } catch (e) {
            console.error('Error inspecting signed PSBT:', e);
          }

          // Broadcast the transaction
          console.log('Broadcasting transaction...');
          try {
            // Instead of using pushPsbt directly, send to our server for finalization and broadcasting
            const broadcastResponse = await fetch(`${API_URL}/api/broadcast`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                signedPsbt: signedPsbtHex,
                originalAddress: utxoAddress
              })
            });

            if (!broadcastResponse.ok) {
              const errorData = await broadcastResponse.json();
              throw new Error(errorData.error || 'Failed to broadcast transaction');
            }

            const { txid } = await broadcastResponse.json();
            console.log('Transaction broadcast successful:', txid);
            console.log('Mint successful!');
            setMintState('success');
          } catch (broadcastError: any) {
            console.error('Broadcasting error:', broadcastError);
            
            // If it's a mock transaction, consider it successful for testing
            if (broadcastError.message && (broadcastError.message.includes('mock_') || broadcastError.message.includes('Development mode'))) {
              console.log('Transaction broadcast in development mode');
              setMintState('success');
            } else {
              setMintError(`Broadcasting failed: ${broadcastError.message || 'Unknown error'}`);
              setMintState('error');
            }
          }
        } catch (signError: any) {
          console.error('Signing error:', signError);
          
          // Check for specific error types
          if (signError.code === 4001 || 
              (signError.message && signError.message.includes('reject'))) {
            setMintError('Transaction rejected by user');
          } else if (signError.message && signError.message.includes('script')) {
            setMintError('Script error: The wallet could not sign this transaction. Try again or use a different wallet.');
          } else {
            setMintError(`Signing failed: ${signError.message || 'Unknown error'}`);
          }
          
          setMintState('error');
        }
      } catch (err: any) {
        // Only handle errors not already handled in the signing process
        if (mintState !== 'error') {
          console.error('=== MINTING FAILED ===');
          console.error('Error type:', typeof err);
          console.error('Error details:', err);

          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setMintError(`Minting failed: ${errorMessage}`);
          setMintState('error');
        }
      }
    });
  };

  const handleCloseModal = () => {
    setMintState('idle');
    setMintError(undefined);
    setShowSuccessElements(false);
  };

  const handleCloseInstructions = () => {
    setShowSegwitInstructions(false);
  };

  const handleSuccessClick = () => {
    handleBombDrop(successRef, 'success', () => {
      setShowSuccessElements(false);
      setMintState('idle');
    });
  };

  const handleBomb8Click = () => {
    handleBombDrop(bomb8Ref, 'bomb8', () => {
      // Only hide bomb8, keep mint-success visible
      setShowBomb8(false);
      
      // Generate tweet after bomb drops
      const tweetText = "I just minted 1,000 free Bitcoin Milady Love Bombs @miladylovebombs using @oylwallet! Mint yours at lovebombs.lol and ignite the chain with oxytocin! #Alkanes #Bitcoin";
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      
      // Open tweet in new window
      window.open(tweetUrl, '_blank', 'width=550,height=420');
    });
  };

  // Log wallet state changes
  useEffect(() => {
    console.log('Wallet state changed:', {
      connected,
      address,
      hasProvider: !!provider,
      balance: balance ? Number(balance) : 0
    });
  }, [connected, address, provider, balance]);

  useEffect(() => {
    // Fixed Y position very close to the top
    const planeY = 10;
    const planeWidth = 600; // Max width in px (matches clamp max)
    const planeStartOffset = planeWidth * 1.2;

    let running = true;
    const animatePlane = (direction = 1) => {
      if (!running) return;
      const startX = direction === 1 ? -planeStartOffset : window.innerWidth + planeStartOffset;
      const endX = direction === 1 ? window.innerWidth + planeStartOffset : -planeStartOffset;
      // FLIP LOGIC: SVG faces left by default, so scaleX: -1 for right, 1 for left
      const scaleX = direction === 1 ? -1 : 1;
      // Set initial position and orientation, hidden
      gsap.set('.plane', {
        x: startX,
        y: planeY,
        scaleX,
        rotation: direction === 1 ? 10 : -10,
        opacity: 1
      });
      // Animate to the other side
      gsap.to('.plane', {
        x: endX,
        y: planeY,
        rotation: direction === 1 ? -10 : 10,
        duration: 14,
        ease: 'power1.inOut',
        onComplete: () => {
          // Hide before jump
          gsap.set('.plane', { opacity: 0 });
          // Instantly start the next pass at the opposite edge, then show
          if (running) {
            setTimeout(() => {
              animatePlane(-direction);
              gsap.set('.plane', { opacity: 1 });
            }, 50);
          }
        }
      });
    };
    animatePlane(1);

    // Handle window resize
    const handleResize = () => {
      gsap.killTweensOf('.plane');
      animatePlane(1);
    };
    window.addEventListener('resize', handleResize);

    // Stagger animation for bombs
    gsap.fromTo(
      '.mint-svg',
      { 
        y: 100, 
        opacity: 0 
      },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.8,
        stagger: {
          each: 0.2,
          from: "center"
        },
        ease: 'power2.out'
      }
    );

    // Add hover animations for bombs
    const svgs = document.querySelectorAll('.mint-svg');
    svgs.forEach(svg => {
      gsap.to(svg, {
        scale: 1,
        duration: 0.3,
        paused: true
      });

      svg.addEventListener('mouseenter', () => {
        gsap.to(svg, {
          scale: 1.1,
          rotation: 5,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      svg.addEventListener('mouseleave', () => {
        gsap.to(svg, {
          scale: 1,
          rotation: 0,
          duration: 0.3,
          ease: 'power2.in'
        });
      });
    });

    return () => {
      running = false;
      window.removeEventListener('resize', handleResize);
      gsap.killTweensOf('.plane');
    };
  }, []);

  // Drop animation handler
  const handleBombDrop = (ref: React.RefObject<HTMLImageElement | null>, bombId: string, onComplete?: () => void) => {
    if (ref.current) {
      gsap.to(ref.current, {
        y: '120vh',
        rotation: 60,
        opacity: 0,
        duration: 1.1,
        ease: 'power1.in',
        onComplete: () => {
          setDroppedBombs(prev => new Set(prev).add(bombId));
          if (onComplete) onComplete();
        }
      });
    }
  };

  // Drop all bombs that haven't been dropped yet
  const dropAllBombs = () => {
    if (!droppedBombs.has('bitcoin')) handleBombDrop(bitcoinRef, 'bitcoin');
    if (!droppedBombs.has('oyl')) handleBombDrop(oylRef, 'oyl'); // Don't open website when auto-dropping
    if (!droppedBombs.has('get')) handleBombDrop(getRef, 'get');
  };

  // Click handlers for each bomb
  const handleBitcoinClick = () => handleBombDrop(bitcoinRef, 'bitcoin');
  const handleOylClick = () => handleBombDrop(oylRef, 'oyl', () => window.open('https://www.oyl.io/', '_blank'));
  

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Segwit Instructions Modal */}
      {showSegwitInstructions && <SegwitInstructionsModal onClose={handleCloseInstructions} />}

      {/* Animated Plane */}
      <div 
        className="plane"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 'clamp(300px, 35vw, 600px)',
          height: 'auto',
          zIndex: 0,
          pointerEvents: 'none',
          transformOrigin: 'center center',
          willChange: 'transform',
          filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
          opacity: 1
        }}
      >
        <img 
          src={plane} 
          alt="Flying Plane"
          style={{
            width: '100%',
            height: 'auto'
          }}
        />
      </div>

      {/* Success Elements */}
      {showSuccessElements && (
        <img
          ref={successRef}
          src={mintSuccess}
          alt="Mint Success"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: 'clamp(250px, 35vw, 450px)',
            height: 'auto',
            cursor: 'pointer',
            zIndex: 1000,
            filter: 'drop-shadow(0 0 20px rgba(144, 238, 144, 0.8))',
            animation: 'slideInFromCorner 0.8s ease-out'
          }}
          onClick={handleSuccessClick}
        />
      )}
      
      {/* Bomb8 - Center of screen */}
      {showBomb8 && (
        <img
          ref={bomb8Ref}
          src={bomb8}
          alt="Success Bomb"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(320px, 42vw, 520px)',
            height: 'auto',
            cursor: 'pointer',
            zIndex: 1000,
            filter: 'drop-shadow(0 0 25px rgba(255, 69, 0, 0.8))',
            animation: 'fadeIn 0.5s ease-in-out'
          }}
          onClick={handleBomb8Click}
        />
      )}

      {/* Loading State with Background Overlay */}
      {mintState === 'loading' && (
        <>
          {/* Background Overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 999
          }} />
          
          {/* Loading Spinner */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '2.5rem', color: '#FFB6C1', marginBottom: '1rem' }}>Minting your 1000 love bombs…</div>
            <div className="mint-spinner" style={{ margin: '0 auto', width: 48, height: 48 }}>
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="#2196F3" strokeWidth="4" fill="none" strokeDasharray="100" strokeDashoffset="60">
                  <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Error State */}
      {mintState === 'error' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center',
          background: 'rgba(30,30,30,0.98)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 0 32px #000',
          maxWidth: '90vw'
        }}>
          <div style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '2.5rem', color: '#ff4444', marginBottom: '1rem' }}>Error</div>
          <div style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '1.2rem', color: '#fff', marginBottom: '1.5rem' }}>{mintError || 'Something went wrong.'}</div>
          <button onClick={handleCloseModal} style={{ fontFamily: 'Wire, Arial, sans-serif', fontSize: '1.2rem', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 2rem', cursor: 'pointer' }}>Close</button>
        </div>
      )}

      {/* Bombs Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(0.5rem, 1.5vw, 1.5rem)',
        maxWidth: '100%',
        width: '100%',
        flexWrap: 'nowrap',
        transform: 'translateY(12vh)',
        padding: '0 clamp(0.5rem, 1vw, 1rem)',
        position: 'relative',
        zIndex: 1,
        overflow: 'visible'
      }}>
        <img
          ref={bitcoinRef}
          src={mintBitcoin}
          alt="Bitcoin"
          className="mint-svg"
          style={{
            width: 'clamp(120px, 18vw, 280px)',
            height: 'auto',
            cursor: 'pointer',
            transform: 'translateY(clamp(-20px, -3vh, -35px))',
            flexShrink: 1
          }}
          onClick={handleBitcoinClick}
        />
        <img
          ref={oylRef}
          src={mintOyl}
          alt="OYL"
          className="mint-svg"
          style={{
            width: 'clamp(120px, 18vw, 280px)',
            height: 'auto',
            cursor: 'pointer',
            transform: 'translateY(clamp(40px, 6vh, 70px))',
            flexShrink: 1
          }}
          onClick={handleOylClick}
        />
        <img
          ref={getRef}
          src={mintGet}
          alt="Get"
          className="mint-svg"
          style={{
            width: 'clamp(120px, 18vw, 280px)',
            height: 'auto',
            cursor: 'pointer',
            transform: 'translateY(clamp(-35px, -5vh, -55px))',
            flexShrink: 1
          }}
          onClick={handleGetClick}
        />
        <img
          ref={bombRef}
          src={mintBomb}
          alt="Mint Love Bomb"
          className="mint-svg"
          style={{
            width: 'clamp(120px, 18vw, 280px)',
            height: 'auto',
            cursor: 'pointer',
            transform: 'translateY(clamp(25px, 4vh, 50px))',
            flexShrink: 1,
            filter: 'drop-shadow(0 0 15px rgba(255, 69, 0, 0.6))'
          }}
          onClick={handleMintClick}
        />
      </div>

      {/* Wallet Connect Area */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10
      }}>
        <WalletSelector />
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          
          @keyframes slideInFromCorner {
            from { 
              opacity: 0; 
              transform: translate(50px, 50px) scale(0.5);
            }
            to { 
              opacity: 1; 
              transform: translate(0, 0) scale(1);
            }
          }
          
          @keyframes slideInFromBottom {
            from { 
              opacity: 0; 
              transform: translateX(-50%) translateY(100px) scale(0.8);
            }
            to { 
              opacity: 1; 
              transform: translateX(-50%) translateY(0) scale(1);
            }
          }
          
          @media (max-width: 1200px) {
            .mint-svg {
              width: clamp(100px, 16vw, 220px) !important;
            }
          }
          
          @media (max-width: 768px) {
            .mint-svg {
              width: clamp(80px, 20vw, 160px) !important;
            }
          }
          
          @media (max-width: 600px) {
            .mint-svg {
              width: clamp(70px, 18vw, 140px) !important;
            }
          }
          
          @media (max-width: 480px) {
            .mint-svg {
              width: clamp(60px, 16vw, 120px) !important;
            }
          }
          
          @media (max-width: 380px) {
            .mint-svg {
              width: clamp(50px, 15vw, 100px) !important;
            }
          }
        `}
      </style>
    </div>
  );
};

const MintPage: React.FC = () => {
  return (
    <>
      {/* Background Video */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        >
          <source src="/mint-background.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Wrap content with LaserEyesProvider using MAINNET with alkanes-optimized data sources */}
      <LaserEyesProvider config={{ 
        network: MAINNET,
        dataSources: {
          // Use Sandshrew as primary - best for alkanes support with your API key
          sandshrew: {
            url: import.meta.env.VITE_SANDSHREW_API_URL,
            apiKey: import.meta.env.VITE_SANDSHREW_PROJECT_ID
          },
          // Use Maestro as secondary - comprehensive Bitcoin data
          maestro: {
            // Uses built-in development API key for now
          },
          // Use Mempool.space as fallback for basic operations
          mempool: {
            url: 'https://mempool.space/api'
          }
        }
      }}>
        <MintContent />
      </LaserEyesProvider>
    </>
  );
};

export default MintPage; 

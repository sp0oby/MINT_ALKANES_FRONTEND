import { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import './index.css';
import LoveBombsTitle from './components/LoveBombsTitle';
import BombAnimation from './components/BombAnimation';
import MintPage from './components/MintPage';

function App() {
  const [greenLetterIndex, setGreenLetterIndex] = useState<number | null>(null);
  const [showMintPage, setShowMintPage] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Generate a random index for the green letter
  useEffect(() => {
    // Pick a random index that is not a space
    const text = "LOVE BOMBS";
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * text.length);
    } while (text[randomIndex] === ' ');
    
    setGreenLetterIndex(randomIndex);
    console.log("Set green letter index to:", randomIndex);
  }, []);

  // Handle green wire selection from LoveBombsTitle
  const handleGreenWire = () => {
    setIsTransitioning(true);
    
    // First fade out the content
    gsap.to('.app-container', {
      duration: 0.5,
      opacity: 0,
      ease: 'power2.inOut',
      onComplete: () => {
        // Then show the mint page with a fade in
        setShowMintPage(true);
        setTimeout(() => {
          gsap.fromTo('.mint-page', 
            {
              opacity: 0,
            },
            {
              duration: 0.5,
              opacity: 1,
              ease: 'power2.inOut',
              onComplete: () => setIsTransitioning(false)
            }
          );
        }, 100);
      }
    });
  };

  if (showMintPage) {
    return (
      <div className="mint-page" style={{ 
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out'
      }}>
        <MintPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="content">
        <LoveBombsTitle greenLetterIndex={greenLetterIndex} onGreenWire={handleGreenWire} />
        <BombAnimation />
      </div>
    </div>
  );
}

export default App;

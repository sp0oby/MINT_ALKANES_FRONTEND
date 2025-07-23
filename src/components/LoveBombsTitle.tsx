import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import speech5 from '../assets/speech5.svg';
import bomb1 from '../assets/bomb1.svg';

interface LoveBombsTitleProps {
  greenLetterIndex: number | null;
  onGreenWire: () => void;
}

const LoveBombsTitle: React.FC<LoveBombsTitleProps> = ({ greenLetterIndex, onGreenWire }) => {
  const titleRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const speech5Ref = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const text = "LOVE BOMBS";
  // Pastel colors - vibrant blue and black, no gray
  const baseColors = [
    '#FFB6C1', // pastel pink
    '#2196F3', // vibrant blue
    '#FFFFFF', // white
    '#000000'  // black
  ];
  
  // Helper to shuffle an array
  function shuffle(array: string[]) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }
  
  // Set up letter animations on hover
  useEffect(() => {
    if (titleRef.current) {
      letterRefs.current.forEach((letter) => {
        if (!letter) return;
        
        // Create hover animations
        letter.addEventListener('mouseenter', () => {
          gsap.to(letter, {
            scale: 1.2,
            rotation: Math.random() * 10 - 5,
            duration: 0.3,
            ease: 'power1.out'
          });
        });
        
        letter.addEventListener('mouseleave', () => {
          gsap.to(letter, {
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: 'power1.in'
          });
        });
      });
    }
    
    // Scroll indicator animation
    if (scrollIndicatorRef.current) {
      gsap.to(scrollIndicatorRef.current, {
        y: '+=20',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }

    return () => {
      // Cleanup event listeners if needed
      letterRefs.current.forEach(letter => {
        if (!letter) return;
        letter.removeEventListener('mouseenter', () => {});
        letter.removeEventListener('mouseleave', () => {});
      });
    };
  }, []);
  
  // Make sure we have a valid green letter index
  const ensuredGreenIndex = greenLetterIndex !== null && greenLetterIndex >= 0 && greenLetterIndex < text.length 
    ? greenLetterIndex 
    : Math.floor(Math.random() * text.length);
  
  // Assign colors so that each color appears at least once (besides green)
  let colorAssignments: string[] = [];
  let colorPool = shuffle([...baseColors]);
  for (let i = 0; i < text.length; i++) {
    if (i === ensuredGreenIndex) {
      colorAssignments.push('#90EE90'); // pastel green
    } else {
      if (colorPool.length === 0) colorPool = shuffle([...baseColors]);
      colorAssignments.push(colorPool.pop()!);
    }
  }
  
  // Function to handle wrong wire selection
  const handleWrongWire = () => {
    // Screen shake effect
    gsap.to(titleRef.current, {
      x: '+=10',
      duration: 0.05,
      yoyo: true,
      repeat: 5,
      ease: 'none',
      clearProps: 'x' // Clear the transform after animation
    });

    // Show and fade out speech5
    if (speech5Ref.current) {
      gsap.set(speech5Ref.current, { display: 'block', opacity: 0 });
      gsap.to(speech5Ref.current, {
        opacity: 1,
        duration: 0.3,
        onComplete: () => {
          gsap.to(speech5Ref.current, {
            opacity: 0,
            duration: 0.5,
            delay: 1,
            onComplete: () => {
              gsap.set(speech5Ref.current, { display: 'none' });
            }
          });
        }
      });
    }
  };

  return (
    <>
      <div 
        className="title-container" 
        ref={titleRef}
        style={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%) translateX(0)',
          textAlign: 'center',
          zIndex: 10,
          width: '90%',
          maxWidth: '1200px'
        }}
      >
        <h1 
          className="love-bombs-text"
          style={{
            fontFamily: 'Wire, Arial, sans-serif',
            fontSize: 'clamp(2rem, 10vw, 11rem)',
            whiteSpace: windowWidth <= 480 ? 'normal' : 'nowrap',
            cursor: 'pointer',
            letterSpacing: 'clamp(1px, 0.5vw, 5px)',
            lineHeight: windowWidth <= 480 ? '1.2' : 'normal',
            margin: windowWidth <= 480 ? '0 auto' : 'initial',
            display: 'block'
          }}
        >
          {text.split('').map((letter, index) => {
            // Add space between LOVE and BOMBS
            if (letter === ' ') {
              return (
                <span 
                  key={index} 
                  className="space" 
                  style={{ 
                    margin: windowWidth <= 480 ? '0.5rem 0' : '0 clamp(10px, 2vw, 30px)',
                    display: windowWidth <= 480 ? 'block' : 'inline-block'
                  }}
                ></span>
              );
            }
            
            // Determine color for this letter
            let color = colorAssignments[index];
            
            return (
              <span 
                key={index}
                ref={(el) => { letterRefs.current[index] = el; }}
                className="letter"
                style={{ 
                  display: 'inline-block',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  color,
                  margin: windowWidth <= 480 ? '0.1rem' : 'initial'
                }}
                onClick={() => {
                  if (index === ensuredGreenIndex) {
                    onGreenWire();
                  } else {
                    handleWrongWire();
                  }
                }}
              >
                {letter}
              </span>
            );
          })}
        </h1>
      </div>
      {/* Speech5 bubble for wrong wire selection */}
      <div
        ref={speech5Ref}
        style={{
          position: 'fixed',
          top: '55%',
          right: windowWidth <= 768 ? '5%' : '10%',
          transform: 'translateY(-50%)',
          zIndex: 11,
          width: windowWidth <= 768 ? '240px' : '320px',
          pointerEvents: 'none',
          display: 'none',
          opacity: 0
        }}
      >
        <img src={speech5} alt="Wrong Wire Message" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
      {/* Scroll Indicator */}
      <div
        ref={scrollIndicatorRef}
        style={{
          position: 'fixed',
          bottom: windowWidth <= 480 ? '20px' : '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: windowWidth <= 480 ? '5px' : '10px',
          zIndex: 10,
          opacity: 0.8
        }}
      >
        <img 
          src={bomb1} 
          alt="Scroll Down" 
          style={{ 
            width: windowWidth <= 480 ? '30px' : '40px',
            height: windowWidth <= 480 ? '30px' : '40px',
          }} 
        />
        <div style={{
          fontFamily: 'Wire, Arial, sans-serif',
          fontSize: 'clamp(0.8rem, 4vw, 1.2rem)',
          color: '#FFB6C1',
          textShadow: '0 0 10px rgba(0,0,0,0.5)',
          letterSpacing: 'clamp(1px, 0.5vw, 2px)'
        }}>
          SCROLL
        </div>
      </div>
    </>
  );
};

export default LoveBombsTitle; 
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import bomb1 from '../assets/bomb1.svg';
import bomb2 from '../assets/bomb2.svg';
import bomb3 from '../assets/bomb3.svg';
import bomb4 from '../assets/bomb4.svg';
import bomb5 from '../assets/bomb5.svg';
import bomb6 from '../assets/bomb6.svg';
import bomb7 from '../assets/bomb7.svg';
import speech1 from '../assets/speech1.svg';
import speech2 from '../assets/speech2.svg';
import speech3 from '../assets/speech3.svg';
import speech4 from '../assets/speech4.svg';

gsap.registerPlugin(ScrollTrigger);

interface BombAnimationProps {
  onLastBombExplode?: () => void;
}

const bombData = [
  { id: 1, img: bomb1, left: '20%' },
  { id: 2, img: bomb2, left: '60%' },
  { id: 3, img: bomb3, left: '30%' },
  { id: 4, img: bomb4, left: '70%' },
  { id: 5, img: bomb5, left: '40%' },
  { id: 6, img: bomb6, left: '25%' },
  { id: 7, img: bomb7, left: '50%' },
];

const sectionHeight = 1000; // px per bomb section

const BombAnimation: React.FC<BombAnimationProps> = ({ onLastBombExplode }) => {
  const bombRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<HTMLDivElement>(null);
  const speech2Ref = useRef<HTMLDivElement>(null);
  const speech3Ref = useRef<HTMLDivElement>(null);
  const speech4Ref = useRef<HTMLDivElement>(null);

  // Add responsive sizing hook
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSmallScreen(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    ScrollTrigger.getAll().forEach(st => st.kill());
    
    // Initialize speech bubbles
    gsap.set(speechRef.current, { opacity: 1, display: 'block' }); // speech1 visible on load
    gsap.set(speech2Ref.current, { opacity: 0, display: 'none' });
    gsap.set(speech3Ref.current, { opacity: 0, display: 'none' });
    gsap.set(speech4Ref.current, { opacity: 0, display: 'none' });

    bombRefs.current.forEach((bomb, i) => {
      if (bomb) {
        gsap.set(bomb, { y: 0, opacity: 1, display: 'none' });
        gsap.to(bomb, {
          y: i === bombData.length - 1 ? '10vh' : '80vh',
          opacity: 1,
          display: 'block',
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: `${i * sectionHeight} top`,
            end: i === bombData.length - 1 
              ? `${(i + 1) * sectionHeight} top+=10vh`
              : `${(i + 1) * sectionHeight} top+=80vh`,
            scrub: true,
            onEnter: () => {
              gsap.set(bomb, { display: 'block', opacity: 1 });
              if (i > 0 && bombRefs.current[i - 1]) {
                gsap.set(bombRefs.current[i - 1], { display: 'none', opacity: 1 });
              }

              // Control speech bubbles based on bomb positions
              if (i === 3) { // When bomb 4 appears
                gsap.to(speech2Ref.current, { opacity: 0, duration: 0.3, onComplete: () => {
                  gsap.set(speech2Ref.current, { display: 'none' });
                }});
              }

              if (i === bombData.length - 1 && onLastBombExplode) {
                setTimeout(onLastBombExplode, 500);
              }
            },
            onLeave: () => {
              gsap.set(bomb, { display: 'none', opacity: 1 });

              // Control speech bubbles based on bomb positions
              if (i === 1) { // When bomb 2 leaves
                gsap.to(speechRef.current, { opacity: 0, duration: 0.3, onComplete: () => {
                  gsap.set(speechRef.current, { display: 'none' });
                  gsap.set(speech2Ref.current, { display: 'block', opacity: 0 });
                  gsap.to(speech2Ref.current, { opacity: 1, duration: 0.3 });
                }});
              }
              if (i === 3) { // When bomb 4 leaves
                gsap.set(speech3Ref.current, { display: 'block', opacity: 0 });
                gsap.to(speech3Ref.current, { opacity: 1, duration: 0.3 });
              }
              if (i === 4) { // When bomb 5 leaves
                gsap.to(speech3Ref.current, { opacity: 0, duration: 0.3, onComplete: () => {
                  gsap.set(speech3Ref.current, { display: 'none' });
                  gsap.set(speech4Ref.current, { display: 'block', opacity: 0 });
                  gsap.to(speech4Ref.current, { opacity: 1, duration: 0.3 });
                }});
              }
            },
            onLeaveBack: () => {
              gsap.set(bomb, { display: 'none', opacity: 1 });
              if (i > 0 && bombRefs.current[i - 1]) {
                gsap.set(bombRefs.current[i - 1], { display: 'block', opacity: 1 });
              }

              // Control speech bubbles when scrolling back up
              if (i === 2) { // When going back before bomb 3
                gsap.to(speech2Ref.current, { opacity: 1, duration: 0.3 });
                gsap.set(speech3Ref.current, { display: 'none', opacity: 0 });
              }
              if (i === 3) { // When going back before bomb 4
                gsap.to(speech2Ref.current, { opacity: 1, duration: 0.3 });
                gsap.set(speech3Ref.current, { display: 'none', opacity: 0 });
              }
              if (i === 4) { // When going back before bomb 5
                gsap.set(speech4Ref.current, { display: 'none', opacity: 0 });
                gsap.to(speech3Ref.current, { opacity: 1, duration: 0.3 });
              }
            },
            onEnterBack: () => {
              gsap.set(bomb, { display: 'block', opacity: 1 });
            },
          },
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [onLastBombExplode]);

  return (
    <div ref={containerRef} style={{ 
      position: 'relative', 
      width: '100%', 
      height: `${sectionHeight * (bombData.length + 0.5)}px`,
      minHeight: '2000px' 
    }}>
      {/* Speech bubble below Love Bombs title */}
      <div
        ref={speechRef}
        style={{
          position: 'fixed',
          top: isMobile ? '40%' : '44%',
          left: isMobile ? '50%' : '54%',
          transform: 'translate(-50%, 0)',
          zIndex: 11,
          width: isMobile ? '240px' : '320px',
          pointerEvents: 'none',
          display: 'block',
        }}
      >
        <img src={speech1} alt="Speech Bubble" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
      {/* Mirrored speech2 bubble below Love Bombs title, opposite side */}
      <div
        ref={speech2Ref}
        style={{
          position: 'fixed',
          top: isMobile ? '44%' : '48%',
          left: isMobile ? '45%' : '48%',
          transform: 'translate(-50%, 0) scaleX(-1)',
          zIndex: 11,
          width: isMobile ? '240px' : '320px',
          pointerEvents: 'none',
          display: 'block',
        }}
      >
        <img src={speech2} alt="Speech Bubble 2" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} />
      </div>
      {/* Speech3 bubble below Love Bombs title, right side */}
      <div
        ref={speech3Ref}
        style={{
          position: 'fixed',
          top: isMobile ? '42%' : '46%',
          left: isMobile ? '50%' : '54%',
          transform: 'translate(-50%, 0)',
          zIndex: 11,
          width: isMobile ? '240px' : '320px',
          pointerEvents: 'none',
          display: 'block',
        }}
      >
        <img src={speech3} alt="Speech Bubble 3" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
      {/* Speech4 bubble below Love Bombs title, left side */}
      <div
        ref={speech4Ref}
        style={{
          position: 'fixed',
          top: isMobile ? '52%' : '56%',
          left: isMobile ? '46%' : '49%',
          transform: 'translate(-50%, 0) scaleX(-1)',
          zIndex: 11,
          width: isMobile ? '240px' : '320px',
          pointerEvents: 'none',
          display: 'block',
        }}
      >
        <img src={speech4} alt="Speech Bubble 4" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} />
      </div>
      {bombData.map((bomb, i) => (
        <div
          key={bomb.id}
          ref={el => { bombRefs.current[i] = el; }}
          style={{
            position: 'fixed',
            top: 0,
            left: bomb.left,
            width: isMobile ? '180px' : isSmallScreen ? '220px' : '260px',
            height: isMobile ? '180px' : isSmallScreen ? '220px' : '260px',
            zIndex: 10,
            pointerEvents: 'none',
            willChange: 'transform',
            opacity: 1,
            mixBlendMode: 'normal',
          }}
        >
          <img src={bomb.img} alt={`Bomb ${bomb.id}`} style={{ width: '100%', height: '100%', opacity: 1, mixBlendMode: 'normal' }} />
        </div>
      ))}
    </div>
  );
};

export default BombAnimation; 
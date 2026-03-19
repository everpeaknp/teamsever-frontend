import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

export function useHighlight(elementId: string) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const hasScrolled = useRef(false);

  const isHighlighted = highlightId === elementId;

  useEffect(() => {
    if (isHighlighted && !hasScrolled.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Add highlight class
          element.classList.add('animate-pulse-highlight');

          // Remove highlight class after animation
          setTimeout(() => {
            element.classList.remove('animate-pulse-highlight');
          }, 2000);

          hasScrolled.current = true;
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isHighlighted, elementId]);

  return { isHighlighted };
}

'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#d946ef', '#ec4899', '#a855f7', '#14b8a6', '#f59e0b', '#22c55e'];

/**
 * Lightweight, dependency-free confetti burst.
 * Re-fires every time the `fire` counter changes.
 */
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fire) return;
    const container = ref.current;
    if (!container) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const pieces: Animation[] = [];
    for (let i = 0; i < 44; i++) {
      const span = document.createElement('span');
      const color = COLORS[i % COLORS.length]!;
      const size = 6 + Math.random() * 6;
      span.style.cssText = `position:absolute;top:0;left:50%;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() < 0.5 ? '50%' : '1px'};will-change:transform,opacity;`;
      container.appendChild(span);

      const dx = (Math.random() - 0.5) * 360;
      const dy = 160 + Math.random() * 200;
      const rot = (Math.random() - 0.5) * 1080;
      const anim = span.animate(
        [
          { transform: 'translate(-50%, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        {
          duration: 1100 + Math.random() * 900,
          easing: 'cubic-bezier(0.18, 0.7, 0.3, 1)',
          fill: 'forwards',
        },
      );
      anim.onfinish = () => span.remove();
      pieces.push(anim);
    }

    return () => {
      pieces.forEach(a => { a.cancel(); });
      container.replaceChildren();
    };
  }, [fire]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/3 z-20 h-0 w-0"
    />
  );
}

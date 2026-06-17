'use client';

import React, { useState, useRef, MouseEvent } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './ZoomableImage.module.css';

export interface ZoomableImageProps {
  src: string;
  alt?: string;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt = 'Image preview' }) => {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleZoomIn = () => setZoom(z => Math.min(4, z + 0.5));
  const handleZoomOut = () => setZoom(z => Math.max(1, z - 0.5));
  
  const handleDoubleClick = () => {
    setZoom(z => z === 1 ? 2 : 1);
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (zoom <= 1 || !containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current || zoom <= 1) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    // Walk speed multiplier
    const walkX = (x - startX) * 1.5; 
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <Button 
          variant="outline" 
          onClick={handleZoomOut} 
          style={{ borderColor: '#444', color: '#fff', minWidth: '32px', padding: '4px 8px', backgroundColor: 'transparent' }}
        >
          -
        </Button>
        <span style={{ color: 'white', display: 'flex', alignItems: 'center', minWidth: '40px', justifyContent: 'center', fontSize: '0.85rem' }}>
          {Math.round(zoom * 100)}%
        </span>
        <Button 
          variant="outline" 
          onClick={handleZoomIn} 
          style={{ borderColor: '#444', color: '#fff', minWidth: '32px', padding: '4px 8px', backgroundColor: 'transparent' }}
        >
          +
        </Button>
      </div>

      <div 
        ref={containerRef}
        className={styles.scrollArea}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ 
          overflow: zoom > 1 ? 'auto' : 'hidden',
          justifyContent: zoom > 1 ? 'flex-start' : 'center', 
          alignItems: zoom > 1 ? 'flex-start' : 'center', 
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' 
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={src} 
          alt={alt} 
          onDoubleClick={handleDoubleClick}
          draggable={false}
          style={{ 
            width: zoom > 1 ? `${zoom * 100}%` : '100%', 
            height: zoom > 1 ? 'auto' : '100%',
            maxWidth: zoom > 1 ? 'none' : '100%',
            maxHeight: zoom > 1 ? 'none' : '100%',
            objectFit: 'contain', 
            borderRadius: '4px',
            transition: isDragging ? 'none' : 'width 0.2s ease-in-out'
          }} 
        />
      </div>
    </div>
  );
};

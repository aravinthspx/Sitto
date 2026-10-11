import React from 'react';
import { useTilt } from '../../hooks/useTilt';
import { cn } from '../../utils/classnames';

export function TiltCard({ children, className, max = 8, disabled = false, ...props }) {
  const ref = useTilt({ max, disabled });
  
  return (
    <div 
      ref={ref} 
      className={cn("tilt-card", className)} 
      {...props}
    >
      {children}
      <div className="tilt-glare" />
    </div>
  );
}

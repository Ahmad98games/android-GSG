import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({ 
  className, 
  variant = 'rectangular',
  ...props 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/[0.03] border border-white/[0.02]",
        variant === 'circular' ? "rounded-full" : "rounded-[2px]",
        variant === 'text' ? "h-3 w-3/4 mb-2" : "",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#1C2028] border border-white/5 p-4 rounded-[4px] space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3 h-4" />
          <Skeleton variant="text" className="w-1/4 h-2" />
        </div>
      </div>
      <Skeleton className="w-full h-24" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="w-20 h-6" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="bg-[#1C2028] border border-white/5 p-6 rounded-[2px] relative overflow-hidden group">
       <div className="flex justify-between items-start mb-4">
          <Skeleton variant="circular" className="w-8 h-8 opacity-20" />
          <Skeleton className="w-12 h-4 rounded-full" />
       </div>
       <Skeleton className="w-3/4 h-8 mb-2" />
       <Skeleton variant="text" className="w-1/2 h-3" />
    </div>
  );
}

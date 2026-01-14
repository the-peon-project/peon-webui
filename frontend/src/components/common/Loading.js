import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading Spinner component with various sizes
 */
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2 
      className={`animate-spin text-purple-400 ${sizeClasses[size]} ${className}`}
    />
  );
};

/**
 * Full page loading state
 */
export const LoadingPage = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="xl" className="mx-auto mb-4" />
      <p className="text-gray-400 animate-pulse">{message}</p>
    </div>
  </div>
);

/**
 * Inline loading state for cards/sections
 */
export const LoadingCard = ({ height = 'h-32' }) => (
  <div className={`${height} flex items-center justify-center`}>
    <LoadingSpinner size="lg" />
  </div>
);

/**
 * Skeleton loader for content
 */
export const Skeleton = ({ className = '', animate = true }) => (
  <div 
    className={`bg-purple-900/30 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
  />
);

/**
 * Skeleton card for loading states
 */
export const SkeletonCard = () => (
  <div className="stone-texture p-4 rounded animate-pulse">
    <div className="flex items-start gap-3 mb-3">
      <Skeleton className="w-12 h-12 rounded" />
      <div className="flex-1">
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="h-10 w-full mb-2" />
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  </div>
);

/**
 * Stats loading skeleton
 */
export const SkeletonStats = () => (
  <div className="grid grid-cols-3 gap-2 mt-2 animate-pulse">
    <Skeleton className="h-12 rounded" />
    <Skeleton className="h-12 rounded" />
    <Skeleton className="h-12 rounded" />
  </div>
);

export default LoadingSpinner;

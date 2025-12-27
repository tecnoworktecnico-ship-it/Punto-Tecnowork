"use client";

import React from 'react';
import Footer from '@/components/Footer';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
  showMadeWithDyad?: boolean;
  centerContent?: boolean;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  className = '', 
  showFooter = true, 
  showMadeWithDyad = true,
  centerContent = false
}) => {
  const contentClasses = centerContent 
    ? "flex flex-col items-center justify-center" 
    : "flex flex-col";

  return (
    <div className={`min-h-screen relative overflow-hidden ${contentClasses} ${className}`}>
      {/* Blobs flotantes decorativos */}
      <div className="blob blob-1 bg-blue-400 -top-10 -left-10 sm:top-10 sm:-left-20 animate-blob-float" />
      <div className="blob blob-2 bg-purple-500 -bottom-10 -right-10 sm:-bottom-20 sm:-right-20 animate-blob-float-reverse animation-delay-200" />
      <div className="blob blob-3 bg-pink-400 top-1/3 -right-10 sm:top-1/2 sm:left-1/4 animate-blob-float animation-delay-400 hidden sm:block" />
      
      <div className="relative z-10 flex-grow w-full">
        {children}
      </div>
      
      {showMadeWithDyad && (
        <div className="relative z-10 mt-4">
          <MadeWithDyad />
        </div>
      )}
      
      {showFooter && (
        <div className="relative z-10 w-full">
          <Footer />
        </div>
      )}
    </div>
  );
};

export default PageWrapper;
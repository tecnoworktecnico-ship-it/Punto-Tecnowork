"use client";

import React from 'react';
import BrandingDisplay from './BrandingDisplay';

const Footer = () => {
  return (
    <footer className="w-full py-4 mt-8 border-t bg-white shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
        <span className="text-sm text-gray-500">Powered by</span>
        <BrandingDisplay type="poweredBy" className="h-8 object-contain" />
        <BrandingDisplay type="poweredBy2" className="h-8 object-contain" />
      </div>
    </footer>
  );
};

export default Footer;
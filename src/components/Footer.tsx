import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-8 py-5">
      <div className="desktop-container flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-3 max-w-[820px] mx-auto px-4">
        <span className="font-medium text-slate-600">
          GCD Plateforme — CEDoc EST Fès
        </span>
        <span className="text-slate-400">
          Université Sidi Mohamed Ben Abdellah · © 2026
        </span>
      </div>
    </footer>
  );
};

export default Footer;

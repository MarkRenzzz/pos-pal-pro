import React from 'react';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

const Header = ({ title, children }: HeaderProps) => {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/de766a0c-8555-4067-98ad-1830ddc6138a.png" 
              alt="Orijins Coffee House" 
              className="h-8 w-8"
            />
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              <p className="text-xs text-primary-foreground/80">Orijins Coffee House</p>
            </div>
          </div>
          {children && (
            <div className="flex items-center space-x-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
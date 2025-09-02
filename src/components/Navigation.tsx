import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20">
      {/* Semi-transparent background with backdrop blur */}
      <div 
        className="absolute inset-0 backdrop-blur-md border-b"
        style={{ 
          backgroundColor: 'hsla(0, 0%, 100%, 0.95)',
          borderColor: 'hsl(var(--border))'
        }}
      />
      
      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          
          {/* Logo Section */}
          <div className="flex flex-col">
            <img 
              src="/lovable-uploads/0eb86765-1d7a-4d88-aa3f-c4524638c942.png" 
              alt="FRACTIONL/AI" 
              className="h-8 md:h-10 w-auto object-contain"
            />
            <span 
              className="hidden md:block text-xs mt-1"
              style={{ color: 'hsl(var(--foreground-secondary))' }}
            >
              AI Leadership Solutions
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('assessment')}
              className="text-base font-medium transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              Assessment
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-base font-medium transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="text-base font-medium transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              Contact
            </button>
            
            {/* CTA Button */}
            <Button
              variant="outline"
              className="ml-4 px-6 py-2 text-sm font-medium rounded-lg border transition-smooth hover:bg-primary hover:text-primary-foreground hover:border-primary"
              style={{
                borderColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary))',
                transition: 'var(--transition-smooth)'
              }}
              onClick={() => scrollToSection('assessment')}
            >
              Get Started
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg transition-smooth"
            style={{ transition: 'var(--transition-smooth)' }}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              {/* Hamburger to X Animation */}
              <div className="absolute inset-0 flex flex-col justify-center space-y-1">
                <span 
                  className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                  style={{ backgroundColor: 'hsl(var(--foreground))' }}
                />
                <span 
                  className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`}
                  style={{ backgroundColor: 'hsl(var(--foreground))' }}
                />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden absolute top-full left-0 right-0 shadow-lg border-t"
          style={{ 
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))'
          }}
        >
          <nav className="px-4 py-6 space-y-4">
            <button
              onClick={() => scrollToSection('assessment')}
              className="block w-full text-left text-base font-medium py-2 transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              Assessment
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left text-base font-medium py-2 transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left text-base font-medium py-2 transition-smooth hover:text-primary"
              style={{ 
                color: 'hsl(var(--foreground-secondary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              Contact
            </button>
            
            <div className="pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <Button
                variant="outline"
                className="w-full px-6 py-3 text-sm font-medium rounded-lg border transition-smooth hover:bg-primary hover:text-primary-foreground hover:border-primary"
                style={{
                  borderColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary))',
                  transition: 'var(--transition-smooth)'
                }}
                onClick={() => scrollToSection('assessment')}
              >
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
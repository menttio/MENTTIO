import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Menu, X } from 'lucide-react';

export default function StickyNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    base44.auth.redirectToLogin();
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            isScrolled ? 'bg-[#41f2c0]' : 'bg-white'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isScrolled ? 'bg-white' : 'bg-[#41f2c0]'
            }`} />
          </div>
          <span className={`text-2xl font-bold transition-colors ${
            isScrolled ? 'text-[#404040]' : 'text-white'
          }`}>
            Men<span className="text-[#41f2c0]">π</span>io
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('features')}
            className={`font-medium transition-colors ${
              isScrolled ? 'text-[#404040] hover:text-[#41f2c0]' : 'text-white hover:text-[#41f2c0]'
            }`}
          >
            Características
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className={`font-medium transition-colors ${
              isScrolled ? 'text-[#404040] hover:text-[#41f2c0]' : 'text-white hover:text-[#41f2c0]'
            }`}
          >
            Cómo funciona
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className={`font-medium transition-colors ${
              isScrolled ? 'text-[#404040] hover:text-[#41f2c0]' : 'text-white hover:text-[#41f2c0]'
            }`}
          >
            Precios
          </button>
          <button
            onClick={() => scrollToSection('testimonials')}
            className={`font-medium transition-colors ${
              isScrolled ? 'text-[#404040] hover:text-[#41f2c0]' : 'text-white hover:text-[#41f2c0]'
            }`}
          >
            Testimonios
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className={`font-medium transition-colors ${
              isScrolled ? 'text-[#404040] hover:text-[#41f2c0]' : 'text-white hover:text-[#41f2c0]'
            }`}
          >
            FAQ
          </button>
          <Button
            onClick={handleGetStarted}
            className="bg-[#41f2c0] text-white hover:bg-[#35d4a7] font-semibold shadow-lg"
          >
            Iniciar Sesión
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-2 transition-colors ${
            isScrolled ? 'text-[#404040]' : 'text-white'
          }`}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg md:hidden">
            <div className="flex flex-col p-4 space-y-3">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-2 text-[#404040] hover:text-[#41f2c0] font-medium"
              >
                Características
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-2 text-[#404040] hover:text-[#41f2c0] font-medium"
              >
                Cómo funciona
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-left py-2 text-[#404040] hover:text-[#41f2c0] font-medium"
              >
                Precios
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="text-left py-2 text-[#404040] hover:text-[#41f2c0] font-medium"
              >
                Testimonios
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-left py-2 text-[#404040] hover:text-[#41f2c0] font-medium"
              >
                FAQ
              </button>
              <Button
                onClick={handleGetStarted}
                className="w-full bg-[#41f2c0] text-white hover:bg-[#35d4a7] font-semibold"
              >
                Iniciar Sesión
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
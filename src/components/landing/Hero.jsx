import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Video, Calendar, Users, User, Settings, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '../../utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Hero() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Only show user as logged in if they have a profile in the database
        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          setUser(currentUser);
          setProfile(teachers[0]);
        } else {
          const students = await base44.entities.Student.filter({ user_email: currentUser.email });
          if (students.length > 0) {
            setUser(currentUser);
            setProfile(students[0]);
          } else {
            // User is authenticated but not registered - don't show as logged in
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleGetStarted = () => {
    window.location.href = createPageUrl('SelectRole');
  };

  const handleLogout = () => {
    const homeUrl = window.location.origin + '/Home';
    base44.auth.logout(homeUrl);
  };

  const goToDashboard = () => {
    window.location.href = createPageUrl('AuthRedirect');
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#41f2c0] via-[#35d4a7] to-[#2ab88f] min-h-screen flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-60 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-20 right-1/3 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#41f2c0]/95 to-[#35d4a7]/95 backdrop-blur-md shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button - Left Side */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="text-white" size={24} /> : <Menu className="text-white" size={24} />}
            </button>
            
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-[#41f2c0]">π</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Men<span className="text-[#404040]">π</span>io</h1>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-white hover:text-[#404040] font-medium transition-colors">
              Características
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-white hover:text-[#404040] font-medium transition-colors">
              ¿Cómo funciona?
            </button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-white hover:text-[#404040] font-medium transition-colors">
              Precios
            </button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })} className="text-white hover:text-[#404040] font-medium transition-colors">
              Testimonios
            </button>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-white hover:text-[#404040] font-medium transition-colors">
              FAQ
            </button>
            <a href="/AboutUs" className="text-white hover:text-[#404040] font-medium transition-colors">
              Sobre nosotros
            </a>
            <a href="/Contact">
              <Button 
                className="bg-white text-[#404040] hover:bg-gray-100 shadow-lg"
              >
                Contáctanos
              </Button>
            </a>
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-[#404040] text-white hover:bg-[#303030] shadow-lg flex items-center justify-center font-semibold transition-all overflow-hidden">
                      {profile?.profile_photo ? (
                        <img 
                          src={profile.profile_photo} 
                          alt={user.full_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.full_name || 'Usuario'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={goToDashboard}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Mi Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl('Profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => window.location.href = createPageUrl('SelectRole')}
                  className="bg-[#404040] hover:bg-[#303030] text-white shadow-lg"
                >
                  Iniciar Sesión
                </Button>
              )
            )}
          </div>

          {/* Mobile User Section */}
          <div className="md:hidden flex items-center gap-3">
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-[#404040] text-white hover:bg-[#303030] shadow-lg flex items-center justify-center font-semibold transition-all overflow-hidden">
                      {profile?.profile_photo ? (
                        <img 
                          src={profile.profile_photo} 
                          alt={user.full_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.full_name || 'Usuario'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={goToDashboard}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Mi Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl('Profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => window.location.href = createPageUrl('SelectRole')}
                  className="bg-[#404040] hover:bg-[#303030] text-white shadow-lg text-sm px-3 py-2"
                >
                  Iniciar Sesión
                </Button>
              )
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2 bg-white/95 backdrop-blur-md rounded-lg mt-4 shadow-xl">
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }} 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  Características
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }} 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  ¿Cómo funciona?
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }} 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  Precios
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }} 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  Testimonios
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }} 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  FAQ
                </button>
                <a 
                  href="/AboutUs" 
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  Sobre nosotros
                </a>
                <a 
                  href="/Contact"
                  className="block w-full text-left px-4 py-2 text-[#404040] hover:bg-[#41f2c0]/10 rounded-lg font-medium transition-colors"
                >
                  Contáctanos
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20 pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="text-white" size={16} />
              <span className="text-white text-sm font-medium">La revolución de las clases particulares</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Tu plataforma de clases
              <span className="block text-[#404040]">todo en uno</span>
            </h1>
            
            <p className="text-base md:text-xl text-white/90 mb-8 leading-relaxed">
              Conecta con profesores expertos, gestiona tus clases, accede a grabaciones y materiales. 
              Todo automatizado en una sola plataforma.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-[#404040] hover:bg-[#303030] text-white px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all"
              >
                Comenzar gratis
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                className="bg-white text-[#41f2c0] hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-xl font-semibold"
              >
                Ver precios
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">1000+</div>
                <div className="text-xs md:text-sm text-white/80">Clases impartidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">500+</div>
                <div className="text-xs md:text-sm text-white/80">Alumnos activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">200+</div>
                <div className="text-xs md:text-sm text-white/80">Profesores</div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Main card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#41f2c0] rounded-xl flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#404040]">Próxima clase</div>
                    <div className="text-sm text-gray-500">Matemáticas · 16:00</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Users className="text-[#41f2c0]" size={20} />
                    <span className="text-sm text-gray-600">Con Prof. García</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Video className="text-[#41f2c0]" size={20} />
                    <span className="text-sm text-gray-600">Grabación disponible</span>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-lg p-4 z-20"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">En línea ahora</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-[#404040] text-white rounded-2xl shadow-lg p-4 z-20"
              >
                <div className="text-2xl font-bold">95%</div>
                <div className="text-xs opacity-90">Satisfacción</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Mail, Instagram, Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Footer() {
  const handleGetStarted = () => {
    base44.auth.redirectToLogin(window.location.origin);
  };

  return (
    <footer className="bg-[#404040] text-white">
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Únete a miles de profesores y alumnos que ya usan Menπio
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-[#41f2c0] hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-xl font-semibold"
            >
              Comenzar gratis ahora
            </Button>
            <Button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              size="lg"
              className="bg-[#404040] text-white hover:bg-[#303030] px-8 py-6 text-lg rounded-xl shadow-xl font-semibold"
            >
              Ver precios
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#41f2c0] rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">π</span>
              </div>
              <h3 className="text-xl font-bold">Men<span className="text-[#41f2c0]">π</span>io</h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              La plataforma todo en uno para profesores y alumnos. Gestión automatizada de clases particulares.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button onClick={() => document.querySelector('section')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#41f2c0] transition-colors">Características</button></li>
              <li><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#41f2c0] transition-colors">Precios</button></li>
              <li><a href="/TeacherSignup" className="hover:text-[#41f2c0] transition-colors">Para Profesores</a></li>
              <li><a href="/SelectRole?role=student" className="hover:text-[#41f2c0] transition-colors">Para Alumnos</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/AboutUs" className="hover:text-[#41f2c0] transition-colors">Sobre nosotros</a></li>
              <li><a href="/Blog" className="hover:text-[#41f2c0] transition-colors">Blog</a></li>
              <li><a href="/Careers" className="hover:text-[#41f2c0] transition-colors">Careers</a></li>
              <li><a href="/Contact" className="hover:text-[#41f2c0] transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button className="hover:text-[#41f2c0] transition-colors">Términos de uso</button></li>
              <li><button className="hover:text-[#41f2c0] transition-colors">Política de privacidad</button></li>
              <li><button className="hover:text-[#41f2c0] transition-colors">Cookies</button></li>
              <li><button className="hover:text-[#41f2c0] transition-colors">Aviso legal</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © 2026 Menπio. Todos los derechos reservados.
          </p>
          
          {/* Social Links */}
          <div className="flex gap-4">
            <button className="w-10 h-10 bg-gray-700 hover:bg-[#41f2c0] rounded-lg flex items-center justify-center transition-colors">
              <Mail size={18} />
            </button>
            <button className="w-10 h-10 bg-gray-700 hover:bg-[#41f2c0] rounded-lg flex items-center justify-center transition-colors">
              <Instagram size={18} />
            </button>
            <button className="w-10 h-10 bg-gray-700 hover:bg-[#41f2c0] rounded-lg flex items-center justify-center transition-colors">
              <Twitter size={18} />
            </button>
            <button className="w-10 h-10 bg-gray-700 hover:bg-[#41f2c0] rounded-lg flex items-center justify-center transition-colors">
              <Linkedin size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
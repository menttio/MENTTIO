import React, { useEffect, useState } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Comparison from '../components/landing/Comparison';
import HowItWorks from '../components/landing/HowItWorks';
import FinalCTA from '../components/landing/FinalCTA';
import StudentSection from '../components/landing/StudentSection';
import Pricing from '../components/landing/Pricing';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Loader2 } from 'lucide-react';

export default function Home() {
  // Antes esto empezaba en true y la portada no se pintaba hasta que el servidor contestaba
  // si había sesión: todo visitante, aunque llegara de Google sin haber entrado nunca, se
  // comía una ruedecita girando antes de leer una sola palabra. Ahora solo esperan quienes
  // tienen señales de sesión; al resto se les pinta la portada de inmediato.
  const [checking, setChecking] = useState(() => {
    try {
      return Boolean(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
    } catch (_e) {
      return false;
    }
  });

  useEffect(() => {
    if (!checking) return;
    const checkSession = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
          if (teachers.length > 0) {
            window.location.href = createPageUrl('TeacherDashboard');
            return;
          }
          const students = await base44.entities.Student.filter({ user_email: user.email });
          if (students.length > 0) {
            window.location.href = createPageUrl('StudentDashboard');
            return;
          }
        }
      } catch (e) {
        // No session or error - show landing page
      }
      setChecking(false);
    };
    checkSession();
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* El orden persigue una conversación: primero el dolor que ya conoce, luego cómo se
          quita, luego cuánto cuesta, y las dudas al final. El precio ya no queda enterrado
          tras cinco secciones, y la página termina pidiendo algo en vez de en el pie.
          Se ha retirado PublicTeachersSection: hablaba como un marketplace ("elige el
          profesor que mejor se adapta a ti") y enseñaba un escaparate casi vacío. */}
      <Hero />
      <Comparison />
      <Features />
      <HowItWorks />
      <StudentSection />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
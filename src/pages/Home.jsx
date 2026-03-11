import React, { useEffect, useState } from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Pricing from '../components/landing/Pricing';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}
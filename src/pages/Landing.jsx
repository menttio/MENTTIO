import React from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Comparison from '../components/landing/Comparison';
import HowItWorks from '../components/landing/HowItWorks';
import StudentSection from '../components/landing/StudentSection';
import Pricing from '../components/landing/Pricing';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';

export default function Landing() {
  return (
    <div className="landing min-h-screen bg-white">
      <Hero />
      <Features />
      <Comparison />
      <HowItWorks />
      <StudentSection />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}
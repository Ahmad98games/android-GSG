'use client';

import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#09090b]">
      <OnboardingWizard onComplete={() => console.log('Onboarding step complete')} />
    </main>
  );
}

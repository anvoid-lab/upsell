'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { MotionCarousel } from '@/components/animate-ui/components/community/motion-carousel';
import { cn } from '@/lib/utils';

interface OnboardingFlowContextValue {
  currentStep: number;
  totalSteps: number;
  next: () => void;
  previous: () => void;
  goTo: (step: number) => void;
}

const OnboardingFlowContext = createContext<OnboardingFlowContextValue | null>(null);

interface OnboardingFlowProps {
  steps: ReactNode[];
  initialStep?: number;
  swipeEnabled?: boolean;
  className?: string;
  onStepChange?: (step: number) => void;
}

export function OnboardingFlow({
  steps,
  initialStep = 0,
  swipeEnabled = true,
  className,
  onStepChange,
}: OnboardingFlowProps) {
  const lastStep = Math.max(0, steps.length - 1);
  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), lastStep),
  );

  const goTo = useCallback((step: number) => {
    const nextStep = Math.min(Math.max(step, 0), lastStep);
    setCurrentStep(nextStep);
  }, [lastStep]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const next = useCallback(() => goTo(currentStep + 1), [currentStep, goTo]);
  const previous = useCallback(() => goTo(currentStep - 1), [currentStep, goTo]);

  const context = useMemo(() => ({
    currentStep,
    totalSteps: steps.length,
    next,
    previous,
    goTo,
  }), [currentStep, goTo, next, previous, steps.length]);

  return (
    <OnboardingFlowContext.Provider value={context}>
      <main
        className={cn(
          'flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-50 px-6 py-10',
          className,
        )}
      >
        <MotionCarousel
          slides={steps}
          selectedIndex={currentStep}
          onSelectedIndexChange={goTo}
          options={{ watchDrag: swipeEnabled }}
          showControls={false}
        />
      </main>
    </OnboardingFlowContext.Provider>
  );
}

export function useOnboardingFlow(): OnboardingFlowContextValue {
  const context = useContext(OnboardingFlowContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within OnboardingFlow.');
  }
  return context;
}

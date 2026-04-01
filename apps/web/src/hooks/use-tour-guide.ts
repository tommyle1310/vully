'use client';

import { useCallback, useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo: {
    element: string;
    on: 'top' | 'bottom' | 'left' | 'right';
  };
  buttons?: Array<{
    text: string;
    action: () => void;
    classes?: string;
  }>;
}

interface UseTourGuideOptions {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export function useTourGuide({
  tourId,
  steps,
  onComplete,
  onSkip,
}: UseTourGuideOptions) {
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has seen this tour
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        // TODO: Replace with actual API call to check user profile
        const seen = localStorage.getItem(`tour_${tourId}`) === 'true';
        setHasSeenTour(seen);
      } catch (error) {
        console.error('Failed to check tour status:', error);
        setHasSeenTour(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTourStatus();
  }, [tourId]);

  // Initialize tour
  useEffect(() => {
    if (hasSeenTour === null) return;

    const newTour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true,
        },
        classes: 'shadow-lg rounded-lg',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    steps.forEach((step, index) => {
      newTour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        buttons: step.buttons || [
          ...(index > 0
            ? [
                {
                  text: 'Back',
                  action: () => newTour.back(),
                  classes: 'shepherd-button-secondary',
                },
              ]
            : []),
          {
            text: index === steps.length - 1 ? 'Finish' : 'Next',
            action: () => {
              if (index === steps.length - 1) {
                markTourComplete();
                newTour.complete();
              } else {
                newTour.next();
              }
            },
            classes: 'shepherd-button-primary',
          },
        ],
      });
    });

    newTour.on('cancel', () => {
      onSkip?.();
    });

    newTour.on('complete', () => {
      onComplete?.();
    });

    setTour(newTour);

    return () => {
      newTour.cancel();
    };
  }, [hasSeenTour, steps, onComplete, onSkip]);

  const markTourComplete = useCallback(async () => {
    try {
      // TODO: Replace with actual API call to update user profile
      localStorage.setItem(`tour_${tourId}`, 'true');
      setHasSeenTour(true);
    } catch (error) {
      console.error('Failed to mark tour as complete:', error);
    }
  }, [tourId]);

  const startTour = useCallback(() => {
    if (tour && !tour.is_active()) {
      tour.start();
    }
  }, [tour]);

  const resetTour = useCallback(async () => {
    try {
      // TODO: Replace with actual API call to reset tour in user profile
      localStorage.removeItem(`tour_${tourId}`);
      setHasSeenTour(false);
    } catch (error) {
      console.error('Failed to reset tour:', error);
    }
  }, [tourId]);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!isLoading && hasSeenTour === false && tour) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasSeenTour, tour, startTour]);

  return {
    tour,
    hasSeenTour,
    isLoading,
    startTour,
    resetTour,
    markTourComplete,
  };
}

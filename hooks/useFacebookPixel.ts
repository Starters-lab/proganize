export const useFacebookPixel = () => {
  const trackEvent = async (eventName: string, customData: Record<string, any> = {}) => {
    try {
      const response = await fetch('/api/facebook-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName,
          customData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track event');
      }
    } catch (error) {
      console.error('Error tracking Facebook event:', error);
    }
  };

  return {
    trackSignup: () => trackEvent('CompleteRegistration'),
    trackPurchase: (value: number, currency: string = 'USD') =>
      trackEvent('Purchase', {
        value,
        currency,
      }),
  };
};

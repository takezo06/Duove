import { useSyncExternalStore } from 'react';
import { getConsent, subscribeConsent } from '../lib/consent';

// The visitor's cookie choice; null until they make one
export const useConsent = () => useSyncExternalStore(subscribeConsent, getConsent);

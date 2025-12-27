
import { CurrencySettings } from '../types';

/**
 * Formate un montant numérique selon les préférences de devise stockées.
 */
export const formatPrice = (amount: number, settings: CurrencySettings | null): string => {
  if (!settings) return amount.toFixed(2) + ' €';

  const { symbol, position, decimalSeparator, thousandSeparator, decimalPlaces } = settings;

  // Formatage du nombre avec les séparateurs personnalisés
  const parts = amount.toFixed(decimalPlaces).split('.');
  
  // Gestion des milliers
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator || ' ');
  
  const formattedNumber = parts.join(decimalSeparator || ',');

  if (position === 'prefix') {
    return `${symbol}${formattedNumber}`;
  }
  return `${formattedNumber}${symbol}`;
};

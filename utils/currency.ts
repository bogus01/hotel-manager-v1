
import { CurrencySettings } from '../types';

/**
 * Formate un montant numérique selon les préférences de devise stockées.
 */
export const formatPrice = (amount: number, settings: CurrencySettings | null): string => {
  // Sécurité si amount est undefined, null, ou une string - conversion explicite en nombre
  const numericAmount = Number(amount) || 0;

  if (!settings) return numericAmount.toFixed(2) + ' €';

  const { symbol, position, decimalSeparator, thousandSeparator, decimalPlaces } = settings;

  // Formatage du nombre avec les séparateurs personnalisés
  const parts = numericAmount.toFixed(decimalPlaces).split('.');

  // Gestion des milliers - On n'utilise l'espace par défaut que si thousandSeparator est undefined ou null
  const tSep = (thousandSeparator !== undefined && thousandSeparator !== null) ? thousandSeparator : ' ';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, tSep);

  // Gestion des décimales
  const dSep = (decimalSeparator !== undefined && decimalSeparator !== null) ? decimalSeparator : ',';
  const formattedNumber = parts.join(dSep);

  if (position === 'prefix') {
    return `${symbol}${formattedNumber}`;
  }
  return `${formattedNumber}${symbol}`;
};

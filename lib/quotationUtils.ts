export interface QuotationLineItemLike {
  total: number;
}

export const validateDiscountValue = (value: string | number): boolean => {
  const raw = String(value).trim();

  if (raw === '') {
    return false;
  }

  const discount = Number(raw);
  return Number.isFinite(discount) && discount >= 0 && discount <= 50;
};

export const calculateTotals = (items: QuotationLineItemLike[], discount: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const tax = taxableAmount * 0.12;
  const total = taxableAmount + tax;

  return {
    subtotal,
    discountAmount,
    tax,
    total,
  };
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getExpiryStatus = (daysLeft: number): { status: string; color: string } => {
  if (daysLeft < 0) return { status: 'Vencida', color: 'text-red-700' };
  if (daysLeft === 0) return { status: 'Hoy vence', color: 'text-orange-700' };
  if (daysLeft <= 3) return { status: `${daysLeft} días`, color: 'text-orange-600' };
  return { status: `${daysLeft} días`, color: 'text-green-600' };
};

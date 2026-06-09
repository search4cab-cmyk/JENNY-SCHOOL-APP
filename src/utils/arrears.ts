import type { Landlord, Payment } from '../types';

export function calculateArrears(landlord: Landlord, payments: Payment[], targetYearStr: string) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const targetYear = parseInt(targetYearStr);
  const currentMonthIdx = currentDate.getMonth(); // 0 = Jan, 11 = Dec
  
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  let monthsDue = 0;
  if (targetYear < currentYear) {
    monthsDue = 12;
  } else if (targetYear === currentYear) {
    monthsDue = currentMonthIdx + 1;
  } else {
    monthsDue = 0;
  }

  let totalExpected = monthsDue * landlord.monthly_levy;
  let absoluteTotalPaid = 0;

  // Track exact months that are underpaid up to the current date
  const outstandingMonths: { month: string; amount: number }[] = [];
  
  for (let i = 0; i < monthsDue; i++) {
    const monthName = months[i];
    const monthPayment = payments.find(p => p.landlord_id === landlord.id && p.payment_month.toLowerCase() === monthName);
    const amountPaid = monthPayment ? monthPayment.amount_paid : 0;
    
    if (amountPaid < landlord.monthly_levy) {
      outstandingMonths.push({
        month: `${monthName.toUpperCase()} ${targetYear}`,
        amount: landlord.monthly_levy - amountPaid
      });
    }
  }

  // Sum all payments in the year (including advance payments in future months)
  payments.forEach(p => {
    if (p.landlord_id === landlord.id) absoluteTotalPaid += p.amount_paid;
  });

  const totalOutstanding = Math.max(0, totalExpected - absoluteTotalPaid);

  return {
    monthsDue,
    totalExpected,
    totalPaid: absoluteTotalPaid,
    totalOutstanding,
    outstandingMonths,
    hasArrears: totalOutstanding > 0
  };
}

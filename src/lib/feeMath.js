// Pact's 2% transaction fee math, in one place. Mirrors the edge-fn
// logic in createPaymentIntent + processDisputeWindowPayments — keep
// in sync (Deno can't import this file directly).
//
// Rounding rule for 'split': contractor's deduction floors, client's
// add-on ceils. Together they sum to the total fee even on odd cents.

export const PACT_FEE_BPS = 200; // 2.00% — display-only; backend is authoritative

export function computeFee(amountCents, feeBps = PACT_FEE_BPS) {
  return Math.floor((amountCents * feeBps) / 10_000);
}

export function feeBreakdown(amountCents, feePayer, feeBps = PACT_FEE_BPS) {
  const fee = computeFee(amountCents, feeBps);
  const half = fee / 2;
  const contractorFee =
    feePayer === 'contractor' ? fee : feePayer === 'split' ? Math.floor(half) : 0;
  const clientFee =
    feePayer === 'client' ? fee : feePayer === 'split' ? Math.ceil(half) : 0;
  return {
    feeCents: fee,
    contractorFeeCents: contractorFee,
    clientFeeCents: clientFee,
    chargeCents: amountCents + clientFee,
    transferCents: amountCents - contractorFee,
  };
}

export function formatUSD(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function feePayerLabel(feePayer) {
  return { contractor: 'Contractor', client: 'Client', split: 'Split 50/50' }[feePayer] ?? feePayer;
}

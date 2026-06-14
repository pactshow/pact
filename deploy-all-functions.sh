#!/usr/bin/env bash
set -e

FUNCTIONS=(
  adminSetCustomBilling
  analyzeContract
  cancelSubscription
  createBankChangeSetup
  createConnectAccountSession
  createPaymentIntent
  createSubscriptionSetup
  deleteAccount
  finalizeBankChange
  finalizeSubscription
  generateContractPDF
  getSubscriptionDetails
  getTaxReport
  refreshConnectStatus
  releasePaymentEarly
  resumeSubscription
  updateSubscription
)

for fn in "${FUNCTIONS[@]}"; do
  echo ""
  echo "==> Deploying $fn"
  npx supabase functions deploy "$fn"
done

echo ""
echo "Done. All ${#FUNCTIONS[@]} functions deployed."

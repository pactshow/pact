import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all contracts where ACH transfer not yet triggered
    const contracts = await base44.asServiceRole.entities.Contract.filter({
      ach_transfer_triggered: false
    });

    const now = new Date();
    const processed = [];
    const errors = [];

    for (const contract of contracts) {
      // Skip if no dispute window set, or window hasn't closed yet
      if (!contract.dispute_window_closes) continue;
      const windowClose = new Date(contract.dispute_window_closes);
      if (windowClose > now) continue;

      // Skip if either party has filed a dispute
      if (contract.artist_disputed || contract.venue_disputed) {
        console.log(`Skipping contract ${contract.id} - active dispute`);
        continue;
      }

      // Skip if not fully signed
      if (!contract.artist_signature || !contract.venue_signature) continue;

      // Get the artist's profile to find ACH banking details
      const profiles = await base44.asServiceRole.entities.Profile.filter({
        name: contract.artist_name,
        type: 'artist'
      });

      const artistProfile = profiles[0];

      if (!artistProfile?.ach_routing_number || !artistProfile?.ach_account_number) {
        console.log(`Skipping contract ${contract.id} - artist has no ACH banking info on profile`);
        errors.push({ contract_id: contract.id, error: 'Artist profile missing ACH banking details' });
        continue;
      }

      // Get pending payments for this contract
      const payments = await base44.asServiceRole.entities.Payment.filter({
        contract_id: contract.id,
        status: 'pending'
      });

      if (payments.length === 0) {
        await base44.asServiceRole.entities.Contract.update(contract.id, {
          ach_transfer_triggered: true,
          ach_transfer_date: now.toISOString()
        });
        continue;
      }

      for (const payment of payments) {
        try {
          // Create or retrieve a Stripe Customer for the artist
          const existingCustomers = await stripe.customers.list({ email: artistProfile.email, limit: 1 });
          let customer;
          if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            customer = await stripe.customers.create({
              name: artistProfile.ach_account_holder || artistProfile.name,
              email: artistProfile.email,
              metadata: { gigflow_profile_id: artistProfile.id }
            });
          }

          // Attach ACH bank account to the customer
          const bankAccount = await stripe.customers.createSource(customer.id, {
            source: {
              object: 'bank_account',
              country: 'US',
              currency: 'usd',
              account_holder_name: artistProfile.ach_account_holder || artistProfile.name,
              account_holder_type: artistProfile.ach_account_type || 'individual',
              routing_number: artistProfile.ach_routing_number,
              account_number: artistProfile.ach_account_number,
            }
          });

          // Create a PaymentIntent using ACH bank debit
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payment.amount * 100),
            currency: 'usd',
            customer: customer.id,
            payment_method_types: ['us_bank_account'],
            payment_method_data: {
              type: 'us_bank_account',
              us_bank_account: {
                routing_number: artistProfile.ach_routing_number,
                account_number: artistProfile.ach_account_number,
                account_holder_type: artistProfile.ach_account_type === 'checking' || artistProfile.ach_account_type === 'savings'
                  ? 'individual'
                  : 'company',
              },
              billing_details: {
                name: artistProfile.ach_account_holder || artistProfile.name,
                email: artistProfile.email,
              }
            },
            confirm: true,
            description: `GigFlow ACH: ${contract.title} - ${payment.type}`,
            metadata: {
              base44_app_id: Deno.env.get("BASE44_APP_ID"),
              contract_id: contract.id,
              payment_id: payment.id,
              payment_type: payment.type,
              artist_name: contract.artist_name,
              venue_name: contract.venue_name,
            }
          });

          // Mark payment as paid in our system
          await base44.asServiceRole.entities.Payment.update(payment.id, {
            status: 'paid',
            paid_date: now.toISOString().split('T')[0],
            payment_method: 'bank_transfer',
            reference_number: paymentIntent.id,
            notes: `Stripe ACH PaymentIntent: ${paymentIntent.id}. Status: ${paymentIntent.status}. Auto-processed after dispute window closed.`
          });

          processed.push({ payment_id: payment.id, intent_id: paymentIntent.id, status: paymentIntent.status });
          console.log(`ACH initiated for payment ${payment.id}, contract ${contract.id}, intent: ${paymentIntent.id}, status: ${paymentIntent.status}`);
        } catch (err) {
          console.error(`Failed to process ACH for payment ${payment.id}:`, err.message);
          errors.push({ payment_id: payment.id, contract_id: contract.id, error: err.message });
        }
      }

      // Mark contract ACH as triggered regardless (to avoid infinite retry on partial failures)
      await base44.asServiceRole.entities.Contract.update(contract.id, {
        ach_transfer_triggered: true,
        ach_transfer_date: now.toISOString()
      });
    }

    return Response.json({
      success: true,
      processed: processed.length,
      errors: errors.length,
      details: { processed, errors }
    });

  } catch (error) {
    console.error('processDisputeWindowPayments error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
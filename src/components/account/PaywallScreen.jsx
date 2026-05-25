import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

const COPY = {
  guest: {
    title: 'Upgrade to send your own contracts',
    body: "You're on the free Guest plan — you can sign and get paid on contracts others send you. To send your own, pick a plan to get started. Your first 30 days are free.",
    cta: 'Choose a plan',
  },
  canceled: {
    title: 'Your subscription has ended',
    body: 'Resubscribe to start sending contracts again. Existing contracts and history stay in your account.',
    cta: 'Resubscribe',
  },
  unpaid: {
    title: "We couldn't collect your payment",
    body: "Your bank rejected the most recent ACH debit. Update your billing bank to restore access — we'll automatically retry.",
    cta: 'Update billing bank',
  },
  incomplete: {
    title: 'Finish setting up your subscription',
    body: 'Your subscription setup didn\'t complete. Head to your profile to finish picking a plan and linking your bank.',
    cta: 'Finish setup',
  },
};

const ICONS = {
  guest: Sparkles,
  canceled: RefreshCw,
  unpaid: AlertTriangle,
  incomplete: Lock,
};

export default function PaywallScreen({ blockReason }) {
  const copy = COPY[blockReason] ?? COPY.guest;
  const Icon = ICONS[blockReason] ?? Lock;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 text-center">
          <div className="mx-auto p-3 rounded-2xl bg-violet-500/10 w-fit mb-5">
            <Icon className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{copy.title}</h1>
          <p className="text-zinc-400 mb-6">{copy.body}</p>
          <Link to={createPageUrl('Profiles')}>
            <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11 px-6">
              {copy.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-zinc-600 mt-6">
            Already paid? Try refreshing — it can take a moment for our records to catch up with your bank.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

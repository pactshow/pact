import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

// Per-feature copy for Pro upgrade nudges. Keep it specific so the
// user knows exactly what they get for upgrading.
const FEATURE_COPY = {
  templates: {
    title: 'Templates are a Pro feature',
    body: 'Save reusable contract templates so you can spin up a new contract in seconds. Available on Artist Pro and Promoter Pro.',
    bullets: [
      'Save unlimited templates',
      'Copy from any past contract',
      'Update templates anytime — past contracts unchanged',
    ],
  },
  contract_upload: {
    title: 'Uploading PDFs is a Pro feature',
    body: 'Already have your own contract? Upload it as a PDF and use Pact to send, sign, and collect payment.',
    bullets: [
      'Upload any PDF (up to 20 MB)',
      'Same e-signature flow as Pact-generated contracts',
      'ACH payments + dispute window still apply',
    ],
  },
  folders: {
    title: 'Tours & Events are a Pro feature',
    body: 'Organize contracts into folders so a multi-show run, festival weekend, or tour stays tidy in one place.',
    bullets: [
      'Group related contracts together',
      'See a folder\'s contracts and dates at a glance',
      'Bulk actions across a whole tour or event',
    ],
  },
  tax_reports: {
    title: 'Tax Reports are a Pro feature',
    body: 'See every contractor you paid through Pact, organized for tax time. Stripe holds the sensitive tax info; this is your bookkeeping view.',
    bullets: [
      'Yearly totals per contractor with Stripe tax-info status',
      'CSV export for your accountant',
      'Highlights anyone over the $600 1099-NEC threshold',
    ],
  },
  custom_clauses: {
    title: 'Custom clauses are a Pro feature',
    body: 'Add your own clauses to the library so they show up alongside the standard ones in every contract.',
    bullets: [
      'Build your own clause library',
      'Reuse across every contract you send',
      'Keep your standard riders consistent',
    ],
  },
  default: {
    title: 'Upgrade to Pro',
    body: 'Get more out of Pact. with Pro features.',
    bullets: [],
  },
};

export default function ProUpgradeScreen({ feature = 'default' }) {
  const copy = FEATURE_COPY[feature] ?? FEATURE_COPY.default;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8">
          <div className="p-3 rounded-2xl bg-violet-500/10 w-fit mb-5">
            <Sparkles className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{copy.title}</h1>
          <p className="text-zinc-400 mb-6">{copy.body}</p>

          {copy.bullets.length > 0 && (
            <ul className="space-y-2 mb-6">
              {copy.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <Link to={createPageUrl('Profiles')}>
            <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11">
              Upgrade to Pro
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

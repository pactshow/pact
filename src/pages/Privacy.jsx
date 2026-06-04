import { Link } from 'react-router-dom';
import { PRIVACY_VERSION } from '@/lib/policies';

const H2 = ({ children, id }) => (
  <h2 id={id} className="text-xl font-semibold text-white mt-10 mb-3 border-b border-zinc-800 pb-2 scroll-mt-20">{children}</h2>
);

const P = ({ children }) => (
  <p className="text-zinc-300 leading-relaxed my-3">{children}</p>
);

const UL = ({ children }) => (
  <ul className="list-disc pl-6 my-3 space-y-1.5 text-zinc-300">{children}</ul>
);

const Notice = ({ children }) => (
  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-xl px-4 py-3 my-4 text-sm">
    {children}
  </div>
);

export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">Pact.</Link>
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pact Privacy Policy</h1>
        <p className="text-zinc-400 text-sm mt-2">Last Updated: June 4, 2026 (Version {PRIVACY_VERSION})</p>

        <Notice>
          This policy explains what information Pact collects, why, who we share it with, and the choices you have. If you don't agree with this policy, don't use Pact.
        </Notice>

        <H2 id="who-we-are">1. Who We Are</H2>
        <P>
          Pact ("Pact," "we," "us") provides a contract-management and payments platform for live-music gigs, connecting artists with venues and promoters. This policy covers the Pact website and application at pact.show and related domains.
        </P>

        <H2 id="what-we-collect">2. Information We Collect</H2>
        <P>We collect the following categories of information:</P>
        <UL>
          <li><strong className="text-white">Account information</strong> — email address and password (hashed); display name; the side of the marketplace you sign up for (artist or promoter).</li>
          <li><strong className="text-white">Profile information you provide</strong> — name, address, phone, website, bio, photo, business name and entity type, standard rate.</li>
          <li><strong className="text-white">Contract content</strong> — the parties, dates, venues, performance details, amounts, signatures, attached PDFs, and any text you enter into clauses, riders, or terms.</li>
          <li><strong className="text-white">Payment information</strong> — collected and held by Stripe, not by Pact. We store references (Stripe IDs) and amounts, but not full card numbers, bank credentials, SSNs, or W-9 data.</li>
          <li><strong className="text-white">Tax onboarding information</strong> — collected by Stripe during Connect onboarding (for contractors receiving payouts). Stripe issues any required 1099-K forms directly. Pact does not store SSNs or EINs.</li>
          <li><strong className="text-white">Error telemetry</strong> — when something breaks, we collect the error message, stack trace, browser type, and the route you were on. <strong className="text-white">This telemetry is not tied to your account or any identifying information</strong> (no IP address, no user ID, no email). We use a third party (Sentry) for this; their privacy practices are linked below.</li>
          <li><strong className="text-white">Cookies and similar technologies</strong> — we use cookies strictly necessary for keeping you signed in. We do not use advertising or cross-site tracking cookies.</li>
        </UL>

        <H2 id="why-we-collect">3. How We Use Information</H2>
        <P>We use the information we collect to:</P>
        <UL>
          <li>Operate the service — create accounts, generate and send contracts, capture signatures, generate PDFs, send notifications.</li>
          <li>Process payments — route funds between counterparties via Stripe, apply Pact's transaction fee.</li>
          <li>Provide customer support — respond to questions, investigate disputes, troubleshoot bugs.</li>
          <li>Improve the service — analyze anonymized error telemetry to find and fix issues; understand which features are used.</li>
          <li>Meet legal obligations — tax reporting (by Stripe), responding to lawful requests.</li>
          <li>Prevent fraud and abuse — detect suspicious activity, enforce our Terms.</li>
        </UL>
        <P>
          We do <strong className="text-white">not</strong> sell your personal information. We do not use your data to train AI models. We do not share your data with advertisers.
        </P>

        <H2 id="ai-features">4. AI Features</H2>
        <P>
          Pact offers an optional AI Contract Analysis feature that sends the text of a contract to Anthropic (the maker of Claude) for analysis. Anthropic processes this content as our service provider and, per their commercial terms, does not retain it for model training. The feature is initiated only when you click "Analyze Contract."
        </P>

        <H2 id="who-we-share-with">5. Service Providers We Share With</H2>
        <P>We share data only with vendors who help us run the service, under contracts that require them to protect your data:</P>
        <UL>
          <li><strong className="text-white">Stripe, Inc.</strong> — payment processing, ACH debits, Connect payouts, tax form issuance. Stripe is the merchant of record. <a className="text-violet-400 hover:text-violet-300 underline" href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>.</li>
          <li><strong className="text-white">Supabase Inc.</strong> — database, authentication, file storage, and serverless functions. <a className="text-violet-400 hover:text-violet-300 underline" href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a>.</li>
          <li><strong className="text-white">Sentry (Functional Software, Inc.)</strong> — anonymized error telemetry. <a className="text-violet-400 hover:text-violet-300 underline" href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">Sentry Privacy Policy</a>.</li>
          <li><strong className="text-white">Vercel Inc.</strong> — application hosting and content delivery. <a className="text-violet-400 hover:text-violet-300 underline" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a>.</li>
          <li><strong className="text-white">Anthropic PBC</strong> — when you use the AI Contract Analysis feature. <a className="text-violet-400 hover:text-violet-300 underline" href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a>.</li>
          <li><strong className="text-white">Cloudflare, Inc.</strong> — bot mitigation (CAPTCHA) on the sign-up flow.</li>
        </UL>
        <P>
          We do not transfer data to other parties for their own marketing or analytics purposes.
        </P>

        <H2 id="counterparties">6. Counterparties on Your Contracts</H2>
        <P>
          When you send or receive a contract, the other party sees the contents of that contract (parties, performance details, amounts, signatures). That sharing is a feature of the service — not a third-party transfer in the privacy sense — but you should treat it as such when deciding what to include.
        </P>

        <H2 id="retention">7. How Long We Keep Data</H2>
        <P>
          We keep your account and contract data for as long as your account is active, plus a period afterward (typically up to 7 years) to satisfy tax, accounting, and legal record-keeping obligations — particularly for contracts involving payment. Anonymized error telemetry is retained according to Sentry's defaults (typically 90 days).
        </P>

        <H2 id="your-rights">8. Your Rights</H2>
        <P>Depending on where you live, you may have rights to:</P>
        <UL>
          <li>Access the data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Delete your account and associated data (subject to legal record-keeping obligations on signed contracts).</li>
          <li>Receive a portable copy of your data.</li>
          <li>Object to or restrict certain processing.</li>
        </UL>
        <P>
          To exercise any of these rights, email us at the address below. We may need to verify your identity before responding.
        </P>

        <H2 id="security">9. Security</H2>
        <P>
          We use industry-standard practices to protect your data, including encryption in transit (HTTPS), encryption at rest (provided by Supabase and Stripe), row-level security on every database table, and least-privilege access for our team. No system is perfectly secure, and you use Pact at your own risk.
        </P>

        <H2 id="children">10. Children</H2>
        <P>
          Pact is not directed to children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.
        </P>

        <H2 id="changes">11. Changes to This Policy</H2>
        <P>
          We may update this policy from time to time. The "Last Updated" date at the top reflects the current version. If we make material changes, we'll notify you in the app or by email before they take effect.
        </P>

        <H2 id="contact">12. Contact</H2>
        <P>
          Privacy questions or requests: <a className="text-violet-400 hover:text-violet-300 underline" href="mailto:hello@pact.show">hello@pact.show</a>.
        </P>

        <div className="mt-12 pt-6 border-t border-zinc-800 text-sm text-zinc-500">
          See also: <Link to="/Terms" className="text-violet-400 hover:text-violet-300 underline">Terms of Service</Link> · <Link to="/Accessibility" className="text-violet-400 hover:text-violet-300 underline">Accessibility</Link>
        </div>
      </article>
    </div>
  );
}

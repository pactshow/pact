import { Link } from 'react-router-dom';
import { ACCESSIBILITY_VERSION } from '@/lib/policies';

const H2 = ({ children, id }) => (
  <h2 id={id} className="text-xl font-semibold text-white mt-10 mb-3 border-b border-zinc-800 pb-2 scroll-mt-20">{children}</h2>
);

const P = ({ children }) => (
  <p className="text-zinc-300 leading-relaxed my-3">{children}</p>
);

const UL = ({ children }) => (
  <ul className="list-disc pl-6 my-3 space-y-1.5 text-zinc-300">{children}</ul>
);

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">Pact.</Link>
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Accessibility Statement</h1>
        <p className="text-zinc-400 text-sm mt-2">Last Updated: June 4, 2026 (Version {ACCESSIBILITY_VERSION})</p>

        <H2 id="commitment">1. Our Commitment</H2>
        <P>
          Pact is committed to making our platform usable by everyone, including people with disabilities. We strive to conform to the <strong className="text-white">Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>, the international standard for digital accessibility, and to the Americans with Disabilities Act (ADA).
        </P>

        <H2 id="features">2. Accessibility Features</H2>
        <P>Pact is built with accessibility in mind. The platform currently supports:</P>
        <UL>
          <li><strong className="text-white">Keyboard navigation</strong> — every interactive element is reachable with the Tab key, and focus is visibly indicated.</li>
          <li><strong className="text-white">Skip-to-content link</strong> — at the top of every page, so screen-reader and keyboard users can bypass navigation.</li>
          <li><strong className="text-white">Screen-reader compatibility</strong> — semantic HTML, ARIA labels on icon-only controls, and meaningful page structure.</li>
          <li><strong className="text-white">Color contrast</strong> — our dark theme is designed to meet WCAG AA contrast ratios for text against background.</li>
          <li><strong className="text-white">Form labels</strong> — every input has a visible label and clear error messages.</li>
          <li><strong className="text-white">Resizable text</strong> — the layout reflows when text is zoomed up to 200% without loss of content or functionality.</li>
          <li><strong className="text-white">Reduced-motion respect</strong> — animations honor your operating system's "Reduce motion" preference.</li>
          <li><strong className="text-white">No keyboard traps</strong> — dialogs and menus can be dismissed with the Escape key.</li>
        </UL>

        <H2 id="ongoing">3. Ongoing Work</H2>
        <P>
          Accessibility is not a one-time check — it's continuous. We test new features against the WCAG checklist before release and welcome feedback from anyone who encounters a barrier. Areas where we know we can do better:
        </P>
        <UL>
          <li>Comprehensive third-party audit (planned).</li>
          <li>Captions or transcripts for any future video content.</li>
          <li>Continued review of color-contrast across newly added components.</li>
        </UL>

        <H2 id="third-party">4. Third-Party Components</H2>
        <P>
          Some parts of Pact rely on third-party services — most notably Stripe for payment forms and bank-linking flows. We choose vendors that publish their own accessibility commitments, but we don't control their interfaces. If you encounter an accessibility issue inside a Stripe form, please let us know and we can usually help complete the action a different way.
        </P>

        <H2 id="feedback">5. Feedback &amp; Support</H2>
        <P>
          If you have trouble using any part of Pact because of a disability, please contact us. We treat accessibility issues with the same urgency as other bugs and will work with you to find a solution.
        </P>
        <P>
          Email: <a className="text-violet-400 hover:text-violet-300 underline" href="mailto:accessibility@pact.show">accessibility@pact.show</a>
        </P>
        <P>
          When you contact us, please tell us:
        </P>
        <UL>
          <li>The page or feature where you encountered the issue.</li>
          <li>What you were trying to do.</li>
          <li>What assistive technology you were using (e.g. VoiceOver, NVDA, JAWS, screen magnifier, switch device).</li>
        </UL>

        <H2 id="formal">6. Formal Complaints</H2>
        <P>
          If you're not satisfied with our response, you may file a complaint with the appropriate accessibility regulator in your jurisdiction.
        </P>

        <div className="mt-12 pt-6 border-t border-zinc-800 text-sm text-zinc-500">
          See also: <Link to="/Terms" className="text-violet-400 hover:text-violet-300 underline">Terms of Service</Link> · <Link to="/Privacy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</Link>
        </div>
      </article>
    </div>
  );
}

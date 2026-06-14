import { Link } from 'react-router-dom';
import { TOS_VERSION } from '@/lib/tos';

const H2 = ({ children }) => (
  <h2 className="text-xl font-semibold text-white mt-10 mb-3 border-b border-zinc-800 pb-2">{children}</h2>
);

const P = ({ children }) => (
  <p className="text-zinc-300 leading-relaxed my-3">{children}</p>
);

const Caps = ({ children }) => (
  <p className="text-zinc-300 leading-relaxed my-3 text-[0.95em]">{children}</p>
);

const Notice = ({ children }) => (
  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-xl px-4 py-3 my-4 text-sm">
    {children}
  </div>
);

const UL = ({ children }) => (
  <ul className="list-disc pl-6 my-3 space-y-1.5 text-zinc-300">{children}</ul>
);

const OL = ({ children }) => (
  <ol className="list-[lower-alpha] pl-6 my-3 space-y-1.5 text-zinc-300">{children}</ol>
);

const Def = ({ term, children }) => (
  <p className="text-zinc-300 leading-relaxed my-2 pl-6 -indent-6">
    <strong className="text-white">"{term}"</strong> {children}
  </p>
);

export default function Terms() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">Pact.</Link>
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pact Terms of Service</h1>
        <p className="text-zinc-400 text-sm mt-2">Last Updated: May 27, 2026 (Version {TOS_VERSION})</p>

        <Notice>
          <strong>IMPORTANT — PLEASE READ CAREFULLY.</strong> These Terms of Service ("Terms") form a binding legal agreement between you ("you," "your," or "User") and Pact, a Tennessee entity ("Pact," "we," "us," or "our"). By creating an account, accessing, or using the Pact platform (the "Platform"), you agree to be bound by these Terms. If you do not agree, do not use the Platform.
        </Notice>

        <Notice>
          <strong>ARBITRATION NOTICE.</strong> Section 17 contains a binding arbitration agreement and a class action waiver. Except for limited exceptions, you and Pact agree to resolve disputes through individual arbitration rather than in court, and you waive the right to participate in a class action.
        </Notice>

        <Notice>
          <strong>ELECTRONIC SIGNATURES AND RECORDS.</strong> You consent to transact business with Pact and with other Users electronically. You agree that your electronic signature, click-to-accept, or other affirmative action on the Platform satisfies any legal requirement that an agreement, signature, or record be in writing, signed, or originally generated and retained in non-electronic form, including under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN), 15 U.S.C. § 7001 et seq., the Uniform Electronic Transactions Act (UETA) as adopted in Tennessee and other states, and similar laws.
        </Notice>

        <Notice>
          <strong>GEOGRAPHIC SCOPE.</strong> The Platform is offered solely to Users located in the United States. You represent that you are located in the United States and will use the Platform only from the United States. You are responsible for compliance with any law that may apply to you elsewhere.
        </Notice>

        <H2>1. Definitions</H2>
        <Def term="Contractor">means a User who uses the Platform to be hired or booked for performance, creative, or related services.</Def>
        <Def term="Client">means a User who uses the Platform to book, hire, or pay Contractors, including venues, event organizers, talent buyers, promoters, and similar parties.</Def>
        <Def term="Counterparty Agreement">means any contract, agreement, or arrangement created, signed, executed, or facilitated between two or more Users using the Platform, including any document uploaded to the Platform.</Def>
        <Def term="Stripe">means Stripe, Inc. and its affiliates, the licensed payments provider used by the Platform.</Def>
        <Def term="Subscription">means any paid plan offered by Pact, including Artist Basic, Artist Pro, Promoter Basic, Promoter Pro, Guest, and any enterprise or custom tier.</Def>
        <Def term="Indemnified Parties">has the meaning given in Section 16.</Def>
        <Def term="User Content">means any content you upload to, submit through, generate via, or otherwise provide to the Platform.</Def>

        <H2>2. Eligibility and Accounts</H2>
        <P>You must be at least 18 years old and able to enter into a binding contract under applicable law. You represent that you are not a minor and that you have not been previously suspended or removed from the Platform.</P>
        <P>You must provide accurate, current, and complete information when creating an account and keep that information up to date. You are responsible for all activity that occurs under your account and for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized access.</P>
        <P>You represent that you are not located in, organized under the laws of, or a resident of any country, region, or jurisdiction subject to comprehensive U.S. sanctions, and that you are not on any U.S. Department of the Treasury Office of Foreign Assets Control ("OFAC") list, the U.S. Department of Commerce Denied Persons List, or any other applicable government denial, debarment, or sanctions list.</P>
        <P>We may refuse, suspend, or terminate any account at our sole discretion, with or without notice, including for suspected fraud, abuse, chargebacks, violation of these Terms, or any reason permitted by law.</P>

        <H2>3. Platform Role — Pact Is Not a Party to Your Contracts</H2>
        <P>Pact is a software platform only. We provide tools that allow Users to create, sign, manage, and pay for Counterparty Agreements. We are not a party to any Counterparty Agreement. We do not negotiate, perform, supervise, control, endorse, guarantee, or insure the services, performances, payments, or conduct of any User. Specifically, and without limitation:</P>
        <UL>
          <li>Pact does not employ, contract with, represent, or act as an agent, broker, manager, booking agent, talent agency, or fiduciary for any Contractor or Client.</li>
          <li>Pact does not book, schedule, produce, promote, manage, stage, host, or perform any event, gig, performance, rehearsal, or service.</li>
          <li>Pact does not guarantee that any User will show up, perform, pay, behave lawfully, or otherwise honor a Counterparty Agreement.</li>
          <li>Pact does not verify the identity, qualifications, licensing, insurance, immigration status, tax status, criminal history, or background of any User, beyond what is required for payment processing through Stripe. You acknowledge that Pact has no obligation to conduct background checks of any kind.</li>
          <li>Pact does not provide legal, tax, accounting, financial, immigration, employment, or business advice. Any templates, sample contracts, clauses, AI-generated analysis, or other content provided through the Platform is informational only and does not constitute advice of any kind.</li>
          <li>You are solely responsible for ensuring any Counterparty Agreement is lawful and enforceable in your jurisdiction.</li>
        </UL>
        <P><strong className="text-white">No Employment, Joint Employment, or Agency Relationship.</strong> Nothing in these Terms or your use of the Platform creates any employment, joint employment, co-employment, staffing, agency, partnership, joint venture, franchise, or fiduciary relationship between Pact and you, between Pact and any other User, or between any Users by virtue of their use of the Platform. You are not an employee, agent, representative, or partner of Pact. You are not authorized to bind Pact in any way. Pact is not a hiring entity, principal, joint employer, or co-employer of you, your employees, your contractors, or anyone you book, hire, or work with through the Platform. You will not represent yourself as employed by, affiliated with, or endorsed by Pact.</P>
        <P><strong className="text-white">You and your counterparty are solely responsible for your Counterparty Agreements.</strong> Any dispute arising from a Counterparty Agreement — including non-performance, late performance, quality of services, payment disputes, cancellations, no-shows, injuries, illness, death, property damage, intellectual property issues, taxes, withholding, classification, immigration status, or any other matter — is between you and your counterparty. Pact is not responsible for resolving, mediating, investigating, or compensating any party in connection with such disputes, except as expressly stated in Section 7 (Dispute Window) and then only at Pact's sole discretion.</P>

        <H2>4. Payments, Stripe, and Funds</H2>
        <P>Stripe is the merchant of record and licensed money transmitter for all payments processed through the Platform. Pact does not accept, hold, transmit, or disburse funds in a legal or fiduciary capacity. All funds paid by Clients and received by Contractors are processed, held, and transferred by Stripe pursuant to the Stripe Connected Account Agreement and the Stripe Services Agreement, which you accept when you onboard to the Platform. You agree to comply with all Stripe terms applicable to you.</P>
        <P>Funds associated with a Counterparty Agreement may sit on the Platform's Stripe balance during the Dispute Window described in Section 7. This is a Stripe-managed balance, not a custodial account operated by Pact. Pact is not a bank, escrow agent, fiduciary, payment processor, money transmitter, trustee, or insurer, and these Terms do not create any such relationship.</P>
        <P>You authorize Pact to instruct Stripe to charge, transfer, refund, reverse, claw back, or otherwise move funds in accordance with these Terms and your use of the Platform, including instructing Stripe to:</P>
        <UL>
          <li>Debit your linked bank account via ACH for Subscription fees and for amounts owed under Counterparty Agreements or these Terms;</li>
          <li>Transfer net proceeds (after the Platform fee described in Section 5) to the Contractor's connected Stripe account following the Dispute Window;</li>
          <li>Reverse, hold, or claw back funds in the event of a chargeback, ACH return, dispute, fraud, or violation of these Terms;</li>
          <li>Offset amounts owed under these Terms (including indemnity obligations) against any Platform balance, future earnings, or linked bank account.</li>
        </UL>
        <P><strong className="text-white">ACH Authorization.</strong> By providing bank account information through Stripe Financial Connections, you authorize Pact and Stripe to initiate ACH debits and credits to your designated account for any amounts you owe under these Terms or any Counterparty Agreement. This authorization remains in effect until you revoke it in writing with at least three (3) business days' notice, except that you may not revoke authorization for transactions already pending or for amounts already owed.</P>
        <P><strong className="text-white">Returns, Reversals, and Chargebacks.</strong> You are responsible for any losses, fees, or penalties resulting from ACH returns, chargebacks, or payment reversals attributable to your account, including any amount previously transferred to you that is later reversed. You authorize Pact to collect such amounts from your linked bank account, your Platform balance, future earnings on the Platform, or to pursue collection through any lawful means, including referral to collection agencies and credit reporting.</P>

        <H2>5. Platform Fees and Subscriptions</H2>
        <P>The Platform charges a Subscription fee for paid tiers and a per-transaction Platform fee (currently 2% of the gross contract amount, subject to change with notice). The Platform fee is deducted at the time funds are transferred from the Platform balance to the Contractor. The party responsible for paying the Platform fee (Contractor, Client, or split) is set per Counterparty Agreement and disclosed before payment.</P>
        <P>Subscription fees are billed monthly via ACH and are non-refundable except as required by law. You may cancel at any time; cancellation takes effect at the end of the current billing period. We may change fees at any time with at least thirty (30) days' notice; your continued use after the effective date constitutes acceptance.</P>
        <P>A free trial may be offered to new accounts. If you do not cancel before the trial ends, you will be billed for the selected plan.</P>
        <P><strong className="text-white">Anti-Circumvention; Liquidated Damages.</strong> You agree not to solicit, accept, route, or arrange off-Platform payment, booking, or settlement for any engagement that was originated, introduced, facilitated, or negotiated on the Platform during an active Subscription. The parties acknowledge that actual damages from such circumvention are difficult to quantify. Accordingly, if you breach this provision, you agree to pay Pact liquidated damages equal to the greater of (a) the Platform fee that would have been owed on the off-Platform transaction, calculated as 10% of the gross transaction value (not Pact's current 2%, to reflect Pact's lost opportunity, recovery costs, and harm), or (b) one thousand U.S. dollars ($1,000) per occurrence. The parties agree this amount is a reasonable estimate, not a penalty. This remedy is in addition to all other available remedies.</P>

        <H2>6. Your Obligations and Acceptable Use</H2>
        <P>You agree that you will not:</P>
        <UL>
          <li>Use the Platform for any unlawful purpose, including money laundering, tax evasion, human trafficking, or violation of sanctions laws;</li>
          <li>Create Counterparty Agreements you do not intend to perform, or use the Platform to extract Subscription benefits without a good-faith business purpose;</li>
          <li>Misrepresent your identity, services, or qualifications;</li>
          <li>Circumvent the Platform as described in Section 5;</li>
          <li>Upload content that is unlawful, infringing, defamatory, obscene, harassing, hateful, threatening, or that you do not have the right to upload;</li>
          <li>Interfere with, reverse engineer, decompile, disassemble, scrape, crawl, data-mine, or attempt to gain unauthorized access to the Platform or any underlying system;</li>
          <li>Use the Platform, any Platform output, or any User Content to train, fine-tune, develop, benchmark, or evaluate any artificial intelligence model, machine learning system, or competing service;</li>
          <li>Use the Platform to send unsolicited communications, spam, or to harass other Users;</li>
          <li>Resell, sublicense, or commercially exploit the Platform other than as expressly permitted.</li>
        </UL>
        <P>You are solely responsible for: (a) the accuracy and legality of all Counterparty Agreements you create or sign; (b) any taxes you owe (Pact does not withhold taxes or issue tax forms beyond what is legally required by Stripe; Stripe issues 1099s where applicable); (c) any licenses, permits, insurance, union dues, and regulatory compliance required for your activities; (d) all activity on your account; and (e) all conduct, safety, and outcomes at any event, gig, or activity related to a Counterparty Agreement.</P>

        <H2>7. Dispute Window</H2>
        <P>Following completion of the booked event under a Counterparty Agreement, Platform funds associated with that Agreement may be held on the Stripe Platform balance for a period determined by Pact in its sole discretion (the "Dispute Window") before being transferred to the Contractor, less any applicable Platform fee. The length of the Dispute Window may vary by Counterparty Agreement, User, tier, payment method, risk factors, or operational considerations, and may be changed at any time without notice.</P>
        <P>During the Dispute Window, either party may notify Pact in writing of a dispute through the in-Platform dispute tool. If a dispute is opened:</P>
        <UL>
          <li>Pact may, in its sole and absolute discretion, delay, extend, shorten, suspend, or release the transfer at any time, including before or after the Dispute Window would otherwise have ended.</li>
          <li>Pact is not an arbitrator, mediator, judge, fact-finder, escrow agent, fiduciary, or trustee, and has no obligation to investigate, weigh evidence, or render judgment on the merits of any dispute.</li>
          <li>Pact may, at its sole discretion and without liability, instruct Stripe to release funds, return funds, hold funds, claw back funds, or take any other action consistent with these Terms.</li>
          <li>Pact may close, resolve, or decline to act on any dispute at any time, with or without explanation.</li>
        </UL>
        <P>If the parties do not resolve a dispute within a period Pact deems reasonable, Pact may release the funds in accordance with the original Counterparty Agreement, return them, or continue to hold them, and direct the parties to resolve any remaining disagreement between themselves through the courts or other lawful means.</P>
        <P>You acknowledge and agree that the Dispute Window is a discretionary operational feature offered as a courtesy. It is not a guarantee, insurance product, escrow service, custodial account, warranty, or any form of dispute resolution service. Pact's decisions regarding the Dispute Window are final, made in our sole discretion, and not subject to appeal. Pact is not liable, under any theory, for any loss, delay, release, hold, reversal, or other action or inaction relating to the Dispute Window, including any tax, interest, opportunity cost, or business loss arising from the timing of fund movement.</P>

        <H2>8. Force Majeure and Event Cancellation</H2>
        <P>Pact is not responsible or liable for any cancellation, postponement, interruption, or modification of any event, gig, performance, rehearsal, travel, or other activity contemplated by a Counterparty Agreement, regardless of cause, including without limitation acts of God, weather, natural disaster, fire, flood, earthquake, pandemic, epidemic, public-health order, quarantine, war, terrorism, civil unrest, riot, strike, labor dispute, governmental action, venue closure, power or utility failure, equipment failure, illness, injury, death, transportation failure, or any other event beyond Pact's reasonable control. Allocation of risk and remedies for any such event is between the parties to the Counterparty Agreement; Pact's only role, if any, is the discretionary movement of funds described in Section 7.</P>

        <H2>9. AI Features, Templates, and Sample Content</H2>
        <P>The Platform may offer AI-assisted contract analysis, suggested clauses, templates, sample agreements, folder structures, and similar content (collectively, "AI/Template Content"). AI/Template Content is generated or assembled by third-party large language models (currently including Anthropic's Claude) and is provided for informational and convenience purposes only.</P>
        <P>AI/Template Content is not legal advice, is not a substitute for an attorney, and may contain errors, omissions, hallucinations, outdated information, or content unsuitable for your situation. You are solely responsible for reviewing all AI/Template Content with qualified counsel before relying on it. Pact disclaims all liability for any reliance on AI/Template Content.</P>
        <P>When you submit a document for AI analysis, you grant Pact and its AI service providers a limited license to process the document solely for purposes of providing the requested feature. Pact does not use your User Content to train its own AI models or those of its providers, except as necessary to deliver the requested feature in real time.</P>

        <H2>10. Your Content and Intellectual Property</H2>
        <P>You retain ownership of User Content. You grant Pact a worldwide, non-exclusive, royalty-free, sublicensable license to host, store, copy, transmit, display, format, and process User Content solely as needed to operate and provide the Platform to you and your counterparties, to enforce these Terms, and to comply with law.</P>
        <P>You represent and warrant that you own or have all necessary rights to your User Content and that it does not infringe any third party's rights.</P>
        <P>All software, design, branding, trademarks, copyrights, trade secrets, AI prompts and outputs originated by Pact, and other materials provided by Pact are owned by Pact or its licensors and are protected by intellectual property laws. We grant you a limited, revocable, non-transferable, non-sublicensable license to use the Platform in accordance with these Terms. No other rights are granted by implication or estoppel.</P>

        <H2>11. DMCA Notice and Takedown</H2>
        <P>Pact respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act ("DMCA"). If you believe that material on the Platform infringes your copyright, please send a written notice to Pact's designated DMCA agent containing:</P>
        <UL>
          <li>A physical or electronic signature of the copyright owner or authorized agent;</li>
          <li>Identification of the copyrighted work claimed to have been infringed;</li>
          <li>Identification of the material claimed to be infringing and information reasonably sufficient to locate it on the Platform;</li>
          <li>Your contact information (address, phone number, email);</li>
          <li>A statement that you have a good-faith belief that the use is not authorized by the owner, its agent, or the law; and</li>
          <li>A statement, under penalty of perjury, that the information is accurate and that you are authorized to act on the owner's behalf.</li>
        </UL>
        <P><strong className="text-white">DMCA Agent:</strong> [to be added — see Section 21].</P>
        <P>Pact may remove or disable access to allegedly infringing material in its discretion. Repeat infringers will have their accounts terminated. Counter-notifications may be submitted in accordance with 17 U.S.C. § 512(g).</P>

        <H2>12. Privacy and Data</H2>
        <P>Our collection and use of personal information is described in our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to that handling. We share certain information with Stripe and other service providers as necessary to provide the Platform.</P>
        <P>Pact may retain account information, Counterparty Agreements, payment records, communications, and other data after account closure as required by law, for tax and audit purposes, for fraud prevention, to enforce these Terms, to defend or assert legal claims, and for legitimate business purposes. Pact disclaims liability for any data loss, breach, unauthorized access, or security incident except to the extent caused by Pact's gross negligence or willful misconduct, and subject in all cases to the limitations in Sections 14 and 15.</P>

        <H2>13. Third-Party Services</H2>
        <P>The Platform integrates with third-party services including Stripe, Supabase, Anthropic, and other providers. Your use of those services is governed by their respective terms. Pact is not responsible for the acts, omissions, outages, security incidents, pricing changes, terms changes, discontinuance, or content of third-party services. Stripe is an intended third-party beneficiary of Sections 3, 4, 7, 14, 15, 16, and 17 of these Terms and may enforce them directly.</P>

        <H2>14. Disclaimers</H2>
        <Caps>THE PLATFORM AND ALL CONTENT, FEATURES, AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, TITLE, QUIET ENJOYMENT, OR UNINTERRUPTED OR ERROR-FREE OPERATION, AND ANY WARRANTY ARISING FROM COURSE OF DEALING, COURSE OF PERFORMANCE, OR USAGE OF TRADE.</Caps>
        <Caps>WITHOUT LIMITING THE FOREGOING, PACT MAKES NO WARRANTY THAT (A) ANY CONTRACTOR OR CLIENT WILL PERFORM, PAY, OR ACT IN GOOD FAITH; (B) ANY COUNTERPARTY AGREEMENT IS LEGALLY VALID, ENFORCEABLE, OR APPROPRIATE FOR YOUR SITUATION; (C) AI/TEMPLATE CONTENT IS ACCURATE, COMPLETE, CURRENT, OR FIT FOR ANY PURPOSE; (D) THE PLATFORM WILL BE FREE FROM BUGS, ERRORS, VIRUSES, OR SECURITY INCIDENTS; (E) DATA WILL NOT BE LOST, CORRUPTED, OR DISCLOSED; OR (F) FUNDS WILL BE MOVED ON ANY PARTICULAR SCHEDULE.</Caps>
        <Caps>PACT EXPRESSLY DISCLAIMS ANY DUTY TO INVESTIGATE, MONITOR, VERIFY, OR VOUCH FOR ANY USER, COUNTERPARTY AGREEMENT, EVENT, VENUE, PERFORMANCE, OR PAYMENT. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES; IN THOSE JURISDICTIONS, SUCH WARRANTIES ARE EXCLUDED TO THE FULLEST EXTENT PERMITTED BY LAW.</Caps>

        <H2>15. Limitation of Liability</H2>
        <Caps>TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL PACT, ITS AFFILIATES, OFFICERS, DIRECTORS, MEMBERS, MANAGERS, SHAREHOLDERS, EMPLOYEES, CONTRACTORS, AGENTS, INVESTORS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, BUSINESS OPPORTUNITY, ANTICIPATED SAVINGS, OR REPUTATIONAL HARM, ARISING OUT OF OR RELATING TO THESE TERMS, THE PLATFORM, OR ANY COUNTERPARTY AGREEMENT, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE AND GROSS NEGLIGENCE TO THE EXTENT PERMITTED BY LAW), STATUTE, OR ANY OTHER LEGAL THEORY, EVEN IF PACT HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</Caps>
        <Caps>IN NO EVENT WILL PACT'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM, IN THE AGGREGATE, EXCEED THE LESSER OF (A) THE TOTAL SUBSCRIPTION FEES PAID BY YOU TO PACT IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).</Caps>
        <Caps>THESE LIMITATIONS APPLY EVEN IF A REMEDY FAILS OF ITS ESSENTIAL PURPOSE, ARE A FUNDAMENTAL BASIS OF THE BARGAIN BETWEEN YOU AND PACT, AND APPLY ON A CUMULATIVE BASIS ACROSS ALL CLAIMS AND ALL INDEMNIFIED PARTIES. YOU AGREE THAT YOU WILL NOT SEEK TO RECOVER MORE THAN THIS CAP, WHETHER DIRECTLY, INDIRECTLY, OR THROUGH ANY OTHER PARTY.</Caps>

        <H2>16. Indemnification</H2>
        <P><strong className="text-white">16.1 Indemnified Parties.</strong> You agree to defend, indemnify, and hold completely harmless Pact, its parents, subsidiaries, affiliates, predecessors, successors, assigns, investors, lenders, licensors, service providers, and each of their respective past, present, and future officers, directors, members, managers, shareholders, employees, contractors, consultants, agents, and representatives (collectively, the "Indemnified Parties"), from and against any and all claims, demands, actions, causes of action, suits, proceedings, investigations, liabilities, damages, judgments, awards, settlements, fines, penalties, taxes, interest, costs, and expenses of every kind and nature, whether known or unknown, foreseen or unforeseen, fixed or contingent, including without limitation reasonable attorneys' fees, expert fees, investigation costs, and court costs (collectively, "Claims"), arising out of, relating to, or in any way connected with:</P>
        <OL>
          <li>your access to or use of the Platform, including any feature, content, output, AI/Template Content, or service provided through it;</li>
          <li>any Counterparty Agreement you create, negotiate, sign, perform, fail to perform, breach, cancel, or are alleged to have done any of the foregoing in connection with;</li>
          <li>any act, omission, statement, performance, non-performance, late performance, or quality of services by you or your counterparty;</li>
          <li>any personal injury, illness, emotional distress, death, property damage, theft, loss, hearing damage, intoxication-related incident, alcohol or controlled-substance incident, assault, harassment, or other harm occurring at, before, after, or in connection with any event, gig, rehearsal, soundcheck, travel, lodging, or other activity related to a Counterparty Agreement;</li>
          <li>any claim that Pact is, was, or should be treated as an employer, joint employer, co-employer, staffing agency, hiring entity, principal, agent, partner, joint venturer, fiduciary, trustee, escrow agent, money transmitter, bank, payment processor, insurer, or guarantor of you or any User, or that you or any User is or was an employee, agent, or representative of Pact, including any claim under the Fair Labor Standards Act, the National Labor Relations Act, ERISA, the Internal Revenue Code, any state wage-and-hour, unemployment, workers' compensation, misclassification, independent contractor, or "ABC test" statute, or any analogous federal, state, local, or foreign law;</li>
          <li>any tax, withholding, contribution, levy, social-insurance, or reporting obligation alleged to be owed by you, by Pact on your behalf, or to or in respect of you, including any obligation under the Internal Revenue Code, any state or local revenue code, or any foreign tax law;</li>
          <li>any union, collective bargaining, AFM, royalty, performance-rights, mechanical, synchronization, master-use, or similar claim relating to a performance, recording, or use of musical or other creative works;</li>
          <li>your User Content, including any allegation of infringement, misappropriation, defamation, invasion of privacy, right of publicity violation, or unlawful content;</li>
          <li>any violation by you of these Terms, any policy referenced herein, any Counterparty Agreement, any applicable law, regulation, ordinance, court order, or any third-party right;</li>
          <li>any chargeback, ACH return, payment reversal, fraud, sanctions violation, or unauthorized transaction associated with your account;</li>
          <li>any dispute between you and any User, counterparty, vendor, venue, employee, contractor, audience member, neighbor, government agency, or other third party;</li>
          <li>any breach of your representations, warranties, or covenants under these Terms;</li>
          <li>any use of, reliance on, or output generated from AI/Template Content; and</li>
          <li>any negligent, reckless, or willful act or omission by you, your employees, your contractors, your agents, your invitees, your guests, or anyone acting on your behalf.</li>
        </OL>
        <P><strong className="text-white">16.2 Scope.</strong> This indemnity applies regardless of the legal theory asserted (including contract, tort, negligence, gross negligence, strict liability, statute, or otherwise), regardless of whether the Claim is brought by a third party, a government authority, a User, or anyone else, and regardless of whether the Indemnified Parties are alleged to have been partially negligent, partially at fault, or partially responsible — in which case this indemnity will apply to the maximum extent permitted by law, and any apportionment of fault shall not reduce your obligation except as required by non-waivable law.</P>
        <P><strong className="text-white">16.3 Defense.</strong> The Indemnified Parties may, at their sole option and at your sole expense, (a) require you to defend the Claim using counsel selected by you and approved in writing by Pact (such approval not to be unreasonably withheld), or (b) assume the exclusive defense and control of the Claim using counsel of Pact's choice, in which case you will pay all reasonable fees and costs as incurred, including monthly invoices, and will fully cooperate with the defense. In either case, you may not settle, compromise, or consent to the entry of any judgment with respect to any Claim without Pact's prior written consent if such settlement (i) imposes any obligation, restriction, payment, or admission on any Indemnified Party, (ii) does not include a full and unconditional release of all Indemnified Parties, or (iii) could reasonably be expected to affect Pact's business, reputation, or rights.</P>
        <P><strong className="text-white">16.4 Payment.</strong> Amounts owed under this Section are due within thirty (30) days of written demand. Pact may, without limiting any other remedy, offset amounts owed under this Section against any funds owed to you on the Platform, against your linked bank account via ACH (which you authorize for this purpose), or against any future amounts that would otherwise be paid to you.</P>
        <P><strong className="text-white">16.5 No Limitation.</strong> The obligations in this Section 16 are in addition to, and not in lieu of, any other obligation, remedy, or liability you may have under these Terms or at law, and survive any termination, expiration, suspension, or modification of these Terms or your account. The limitations of liability in Section 15 do not limit your obligations under this Section 16.</P>
        <P><strong className="text-white">16.6 Pact's Affirmative Rights.</strong> Nothing in this Section 16 limits Pact's right to bring its own claim against you for breach of these Terms, including for damages, equitable relief, or both, whether or not a third-party Claim exists. Pact's remedies are cumulative.</P>
        <P><strong className="text-white">16.7 No Insurance.</strong> You acknowledge that Pact does not provide insurance of any kind for you, your counterparties, your events, or any activity conducted through the Platform. You are solely responsible for obtaining and maintaining any insurance you determine necessary, including general liability, professional liability, event cancellation, workers' compensation, and similar coverage.</P>
        <P><strong className="text-white">16.8 Release.</strong> In addition to your indemnity obligations, you hereby release, waive, and forever discharge the Indemnified Parties from any and all Claims that you have or may have against them arising out of or relating to (i) any Counterparty Agreement, (ii) any dispute with another User or third party, (iii) any act, omission, or condition at any event or venue, (iv) any AI/Template Content, or (v) any release, hold, delay, or movement of funds. This release applies to Claims you do not know or suspect to exist at the time, and you expressly waive the benefit of any statute or rule (including California Civil Code § 1542, to the extent applicable) that would limit the effect of this release to known Claims. <span className="uppercase">Section 1542 states: "A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party."</span></P>
        <P><strong className="text-white">16.9 Assumption of Risk.</strong> You acknowledge that live music, performance, event production, and related activities involve inherent risks, including without limitation risks of injury, illness, hearing damage, property damage, loss, theft, financial loss, and reputational harm. You voluntarily assume all such risks and agree that the Indemnified Parties bear no responsibility for them.</P>

        <H2>17. Binding Arbitration and Class Action Waiver</H2>
        <P><strong className="text-white">Please read this Section carefully. It affects your legal rights.</strong></P>
        <P>You and Pact agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Platform, whether sounding in contract, tort, statute, or otherwise (a "Dispute"), will be resolved by binding individual arbitration administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules, except as set forth below. The arbitration will be conducted in Davidson County, Tennessee, or, at your election, by telephone, video, or written submissions only. The arbitrator will have authority to award the same remedies a court could award on an individual basis. The arbitrator's decision is final and may be entered as a judgment in any court of competent jurisdiction.</P>
        <P><strong className="text-white">Class Action Waiver.</strong> You and Pact agree that each party may bring claims against the other only in your or its individual capacity and not as a plaintiff or class member in any purported class, collective, consolidated, mass, or representative proceeding. The arbitrator may not consolidate or join the claims of multiple persons and may not preside over any form of representative or class proceeding. If this Class Action Waiver is found to be unenforceable as to any claim, that claim must be severed from the arbitration and litigated in court; the rest of the arbitration agreement remains in effect.</P>
        <P><strong className="text-white">Mass Arbitration Procedures.</strong> If twenty-five (25) or more similar arbitration demands are filed against Pact by or with the assistance of the same or coordinated counsel within a sixty (60)-day period, the parties agree to the following batch process: counsel will select ten (10) bellwether cases per side to proceed; the remaining cases will be stayed; and the parties will use the bellwether results to mediate global resolution before further cases proceed.</P>
        <P><strong className="text-white">Exceptions.</strong> Either party may bring an individual action in small claims court for disputes within that court's jurisdiction. Either party may seek injunctive or equitable relief in a court of competent jurisdiction to protect intellectual property rights, enforce confidentiality, or prevent unauthorized access to the Platform.</P>
        <P><strong className="text-white">Opt-Out.</strong> You may opt out of this Section 17 by sending written notice to Pact at the address in Section 21 within thirty (30) days of first accepting these Terms, stating your name, account email, and that you wish to opt out of arbitration. Opting out will not affect any other provision of these Terms.</P>
        <P><strong className="text-white">Informal Resolution First.</strong> Before initiating arbitration, you agree to first contact us in writing and allow sixty (60) days to attempt to resolve the Dispute informally. The statute of limitations and any filing-fee deadlines will be tolled during this period.</P>

        <H2>18. Suspension and Termination</H2>
        <P>You may close your account at any time through the Platform. Pact may suspend or terminate your account at any time, with or without notice, for any reason permitted by law, including suspected fraud, abuse, chargebacks, repeated disputes, violation of these Terms, or as required by Stripe or law enforcement.</P>
        <P>Upon termination, your right to use the Platform ceases. Sections that by their nature should survive — including Sections 1, 3, 4, 5 (with respect to unpaid amounts and circumvention damages), 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, and 20 — will survive termination.</P>

        <H2>19. Governing Law and Venue</H2>
        <P>These Terms are governed by the laws of the State of Tennessee, without regard to its conflict-of-laws principles. The Federal Arbitration Act governs the interpretation and enforcement of Section 17. Subject to Section 17, any action not subject to arbitration will be brought exclusively in the state or federal courts located in Davidson County, Tennessee, and you consent to the personal jurisdiction of those courts and waive any objection based on inconvenient forum.</P>

        <H2>20. Changes to These Terms</H2>
        <P>We may modify these Terms from time to time. If we make material changes, we will provide notice (for example, by email to the address on file or in-app notice) at least thirty (30) days before the changes take effect, except where a shorter period is required by law, by Stripe, or by the operational needs of the Platform. Your continued use of the Platform after the effective date constitutes acceptance of the updated Terms. If you do not agree, you must stop using the Platform.</P>

        <H2>21. Miscellaneous</H2>
        <P><strong className="text-white">Entire Agreement.</strong> These Terms, together with the Privacy Policy and any policies referenced herein, constitute the entire agreement between you and Pact regarding the Platform and supersede all prior or contemporaneous communications.</P>
        <P><strong className="text-white">Severability.</strong> If any provision is held unenforceable, the remaining provisions remain in full force and effect, and the unenforceable provision will be modified to the minimum extent necessary to make it enforceable while preserving its intent.</P>
        <P><strong className="text-white">No Waiver.</strong> Our failure to enforce any provision is not a waiver of that or any other provision. A waiver is only effective if in writing and signed by an authorized representative of Pact.</P>
        <P><strong className="text-white">Assignment.</strong> You may not assign these Terms without our prior written consent; any attempted assignment is void. We may assign these Terms freely, including in connection with a merger, acquisition, financing, reorganization, or sale of assets.</P>
        <P><strong className="text-white">Force Majeure.</strong> Pact is not liable for delays or failures caused by events beyond our reasonable control, as further described in Section 8.</P>
        <P><strong className="text-white">Notices.</strong> Pact may provide notices to you by email to the address on file with your account, by in-Platform notification, or by posting on the Platform; any such notice is deemed received when sent or posted. You may provide notice to Pact at the address below. You are responsible for keeping your email and contact information current.</P>
        <P><strong className="text-white">No Agency.</strong> Nothing in these Terms creates any partnership, joint venture, employment, agency, fiduciary, franchise, or similar relationship between you and Pact, or between Pact and any other User.</P>
        <P><strong className="text-white">No Third-Party Beneficiaries.</strong> Except as expressly set forth in Section 13 with respect to Stripe and as set forth in Section 16 with respect to the Indemnified Parties, these Terms confer no third-party beneficiary rights.</P>
        <P><strong className="text-white">Headings.</strong> Section headings are for convenience only and do not affect interpretation.</P>
        <P><strong className="text-white">Construction.</strong> The parties have had the opportunity to review these Terms; no rule of construction against the drafter applies.</P>
        <P><strong className="text-white">Contact / DMCA Agent / Mailing Address.</strong></P>
        <P>Pact<br />[Mailing Address — to be added]<br />Email: [legal@pact.show — to be confirmed]<br />DMCA Agent: [name + address — to be added and registered with the U.S. Copyright Office]</P>

        <div className="mt-12 pt-6 border-t-2 border-zinc-700 text-center uppercase tracking-wide text-sm text-zinc-400">
          By clicking "I Agree," creating an account, or using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms, including the arbitration agreement and class action waiver in Section 17 and the indemnity and release in Section 16.
        </div>
      </main>
    </div>
  );
}

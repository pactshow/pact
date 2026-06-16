-- =====================================================================
-- Pact. — Seed clauses from Neutral_Agreement.pdf
--
-- Same 35-section structure as the Client-Favoring set (0032), but with
-- balanced wording. Slugs prefixed `n_` so the whole neutral set can be
-- identified, listed, or bulk-removed later. Categories match 0032 so
-- the picker shows cf_/n_ siblings in the same buckets.
--
-- Bracketed alternatives inside the PDF text (e.g. "[provide / reimburse
-- / not provide]", "[returned / retained / pro-rated]") are preserved
-- verbatim — the user picks one when assembling a contract. Only single-
-- value placeholders like [number], [$amount], [time] were converted to
-- {{snake_case}} variables.
--
-- Cross-references ("Section 5", "Section 20", "Section 25") are kept
-- verbatim from the PDF and assume the full neutral template is used in
-- order. Admins should edit them if you mix sets or reorder.
--
-- Re-runnable: ON CONFLICT (slug) DO NOTHING.
-- =====================================================================

insert into clause_library
  (slug, title, category, content, sort_order, is_active, variables)
values

(
  'n_parties',
  'Parties and Contact Information',
  'Parties',
  $n$The Vendor is {{vendor_legal_name}}, with a principal address at {{vendor_address}}, represented for purposes of this Agreement by {{vendor_rep_name}}, {{vendor_rep_title}} ("Vendor Representative"), reachable at {{vendor_phone}} and {{vendor_email}}. The Client is {{client_legal_name}}, with a principal address at {{client_address}}, represented by {{client_rep_name}}, {{client_rep_title}} ("Client Representative"), reachable at {{client_phone}} and {{client_email}}. For purposes of this Agreement, the Vendor is the performing artist and the Client is the venue engaging the Vendor.

Each Party designates the contact above as its authorized representative for all communications, approvals, and notices relating to this engagement. A Party may change its designated representative by written notice to the other Party.$n$,
  1010, true,
  '[
    {"key":"vendor_legal_name","label":"Vendor legal name","default":"","type":"text"},
    {"key":"vendor_address","label":"Vendor address","default":"","type":"text"},
    {"key":"vendor_rep_name","label":"Vendor rep name","default":"","type":"text"},
    {"key":"vendor_rep_title","label":"Vendor rep title","default":"","type":"text"},
    {"key":"vendor_phone","label":"Vendor phone","default":"","type":"text"},
    {"key":"vendor_email","label":"Vendor email","default":"","type":"text"},
    {"key":"client_legal_name","label":"Client legal name","default":"","type":"text"},
    {"key":"client_address","label":"Client address","default":"","type":"text"},
    {"key":"client_rep_name","label":"Client rep name","default":"","type":"text"},
    {"key":"client_rep_title","label":"Client rep title","default":"","type":"text"},
    {"key":"client_phone","label":"Client phone","default":"","type":"text"},
    {"key":"client_email","label":"Client email","default":"","type":"text"}
  ]'::jsonb
),

(
  'n_recitals',
  'Recitals and Background',
  'Background',
  $n$The Client operates a performance venue located at {{venue_name_address}} and wishes to engage the Vendor to render a live performance. The Vendor is a professional performer willing to provide such services on the terms set out below. The Parties enter into this Agreement to record their mutual understanding regarding the engagement, compensation, and respective responsibilities.$n$,
  1020, true,
  '[{"key":"venue_name_address","label":"Venue name and address","default":"","type":"text"}]'::jsonb
),

(
  'n_definitions',
  'Definitions',
  'Background',
  $n$In this Agreement: "Engagement" means the performance and related services described in Section 5; "Performance" means the live appearance by the Vendor on the Date(s) specified in Section 6; "Guarantee" means the fixed fee payable to the Vendor under Section 8; "Gross Box Office Receipts" means total ticket revenue actually received, less only the deductions expressly permitted in Section 8; "Rider" means the technical and hospitality requirements attached as Exhibits; and "Force Majeure" has the meaning given in Section 20.$n$,
  1030, true,
  '[]'::jsonb
),

(
  'n_engagement',
  'Engagement',
  'Performance',
  $n$The Client engages the Vendor, and the Vendor accepts, to render a live performance of the type described in Section 5 (the "Engagement"). The Vendor shall perform in a professional and workmanlike manner consistent with industry standards and the Vendor's reputation and customary style.$n$,
  1040, true,
  '[]'::jsonb
),

(
  'n_description_of_performance',
  'Description of Performance',
  'Performance',
  $n$The Performance shall consist of {{number_of_sets}} set(s) totaling approximately {{performance_minutes}} minutes of performance time, exclusive of intermissions and encores. The general nature, genre, and content shall be substantially consistent with the Vendor's customary repertoire and promotional representations. Any encore is at the Vendor's discretion unless otherwise agreed in writing.$n$,
  1050, true,
  '[
    {"key":"number_of_sets","label":"Number of sets","default":"1","type":"number"},
    {"key":"performance_minutes","label":"Approx minutes","default":"60","type":"number","suffix":"min"}
  ]'::jsonb
),

(
  'n_date_time_schedule',
  'Date, Time, and Schedule',
  'Performance',
  $n$The Performance shall take place on {{performance_date}}. The schedule shall be approximately: load-in {{load_in_time}}; soundcheck {{soundcheck_time}}; doors {{doors_time}}; Vendor takes stage {{stage_time}}; Performance concludes by {{end_time}}; load-out by {{load_out_time}}, subject to reasonable adjustment by mutual agreement. If the Client causes a delay to the advertised start, the Vendor shall not be in breach for a corresponding adjustment to set length or end time.$n$,
  1060, true,
  '[
    {"key":"performance_date","label":"Performance date","default":"","type":"text"},
    {"key":"load_in_time","label":"Load-in","default":"","type":"text"},
    {"key":"soundcheck_time","label":"Soundcheck","default":"","type":"text"},
    {"key":"doors_time","label":"Doors","default":"","type":"text"},
    {"key":"stage_time","label":"Vendor on stage","default":"","type":"text"},
    {"key":"end_time","label":"Performance ends by","default":"","type":"text"},
    {"key":"load_out_time","label":"Load-out by","default":"","type":"text"}
  ]'::jsonb
),

(
  'n_venue_premises',
  'Venue and Premises',
  'Performance',
  $n$The Performance shall take place at {{venue_name}}, {{venue_address}} (the "Premises"), capacity approximately {{venue_capacity}}. The Client represents that the Premises are properly zoned, licensed, and suitable for the Performance, and that stage, electrical, and structural elements meet applicable safety codes. The Client shall provide safe and reasonable access to the stage, dressing rooms, and loading areas during the scheduled times.$n$,
  1070, true,
  '[
    {"key":"venue_name","label":"Venue name","default":"","type":"text"},
    {"key":"venue_address","label":"Venue address","default":"","type":"text"},
    {"key":"venue_capacity","label":"Approx capacity","default":"","type":"number"}
  ]'::jsonb
),

(
  'n_compensation',
  'Compensation and Payment',
  'Compensation',
  $n$In consideration of the Performance, the Client shall pay the Vendor a guarantee of ${{guarantee_amount}} (the "Guarantee"). [Optional: plus {{backend_percentage}}% of Gross Box Office Receipts above ${{backend_threshold}}.] A deposit of {{deposit_amount}} shall be paid {{deposit_days_advance}} days in advance, and the balance on the day of the Performance, by {{payment_method}}. Any backend shall be settled within {{backend_settle_days}} days with a written box office statement.

The Client is responsible for taxes, levies, or withholdings required by law other than taxes on the Vendor's net income. All amounts are stated in {{currency}}. Late payments accrue interest at {{late_interest_rate}}% per month or the maximum permitted by law, whichever is less.$n$,
  1080, true,
  '[
    {"key":"guarantee_amount","label":"Guarantee","default":"","type":"number","suffix":"$"},
    {"key":"backend_percentage","label":"Backend %","default":"","type":"number","suffix":"%"},
    {"key":"backend_threshold","label":"Backend threshold","default":"","type":"number","suffix":"$"},
    {"key":"deposit_amount","label":"Deposit ($ or %)","default":"","type":"text"},
    {"key":"deposit_days_advance","label":"Deposit due","default":"30","type":"days","suffix":"days before"},
    {"key":"payment_method","label":"Payment method","default":"ACH","type":"text"},
    {"key":"backend_settle_days","label":"Backend settle window","default":"14","type":"days"},
    {"key":"currency","label":"Currency","default":"USD","type":"text"},
    {"key":"late_interest_rate","label":"Late interest","default":"1.5","type":"number","suffix":"%/mo"}
  ]'::jsonb
),

(
  'n_settlement',
  'Settlement and Accounting',
  'Compensation',
  $n$Where compensation depends in whole or in part on ticket sales, the Client shall maintain accurate records of ticket sales, comps, and deductions and make them available to the Vendor Representative at settlement. Settlement shall occur on the night of the Performance unless otherwise agreed. The Vendor Representative may be present during the box office count and review supporting documentation.$n$,
  1090, true,
  '[]'::jsonb
),

(
  'n_technical_rider',
  'Technical Requirements (Technical Rider)',
  'Riders',
  $n$The Client shall provide, at its sole cost unless otherwise specified, the equipment described in the Technical Rider (Exhibit A) and competent technical personnel during load-in, soundcheck, the Performance, and load-out. In the event of a conflict between this Agreement and the Technical Rider, the [Technical Rider / body of this Agreement] shall control.$n$,
  1100, true,
  '[]'::jsonb
),

(
  'n_hospitality_rider',
  'Hospitality (Hospitality Rider)',
  'Riders',
  $n$The Client shall provide the items described in the Hospitality Rider (Exhibit B), including dressing-room accommodations, catering or buyout, and refreshments for the Vendor and its personnel. Any buyout in lieu of catering shall be ${{buyout_per_person}} per person, payable at settlement.$n$,
  1110, true,
  '[{"key":"buyout_per_person","label":"Buyout per person","default":"","type":"number","suffix":"$"}]'::jsonb
),

(
  'n_equipment_production',
  'Equipment and Production',
  'Logistics',
  $n$Except as set out in the Technical Rider, each Party is responsible for its own equipment. The Vendor is responsible for its instruments and personal equipment, and the Client for the house sound and lighting. Each Party is responsible for damage caused by its own negligence or that of its personnel.$n$,
  1120, true,
  '[]'::jsonb
),

(
  'n_travel_lodging',
  'Travel, Lodging, and Per Diems',
  'Logistics',
  $n$The Client shall [provide / reimburse / not provide] the Vendor's travel, ground transportation, and lodging as specified: [details]. The Client shall pay per diems of ${{per_diem_amount}} per person per day, payable [in advance / at settlement]. Client-arranged lodging shall be of a standard reasonably acceptable to the Vendor and within {{lodging_distance}} of the Premises.$n$,
  1130, true,
  '[
    {"key":"per_diem_amount","label":"Per diem","default":"75","type":"number","suffix":"$"},
    {"key":"lodging_distance","label":"Max lodging distance","default":"","type":"text"}
  ]'::jsonb
),

(
  'n_marketing_promotion',
  'Marketing and Promotion',
  'Marketing',
  $n$The Client shall promote the Performance at its own cost and use commercially reasonable efforts to maximize attendance, and may use the Vendor's name, approved likeness, logo, and approved materials solely to promote this Performance. Materials beyond standard listings are subject to the Vendor's prior reasonable approval. The Client shall not use the Vendor's name or likeness to imply endorsement without written consent.$n$,
  1140, true,
  '[]'::jsonb
),

(
  'n_ticketing',
  'Ticketing',
  'Marketing',
  $n$The Client shall set ticket prices at ${{ticket_price}} (or as mutually agreed), control the on-sale date of {{on_sale_date}}, and manage ticketing. The Vendor shall receive {{vendor_comp_tickets}} complimentary tickets per Performance, subject to availability and advance request. The Client shall not oversell beyond lawful capacity. Premium or bundled ticketing featuring the Vendor is subject to the Vendor's prior approval.$n$,
  1150, true,
  '[
    {"key":"ticket_price","label":"Ticket price","default":"","type":"number","suffix":"$"},
    {"key":"on_sale_date","label":"On-sale date","default":"","type":"text"},
    {"key":"vendor_comp_tickets","label":"Vendor comp tickets","default":"4","type":"number"}
  ]'::jsonb
),

(
  'n_recording_broadcast',
  'Recording, Broadcast, and Streaming',
  'Marketing',
  $n$No audio or visual recording, broadcast, webcast, or streaming shall occur without the Vendor's prior written consent. Any permitted recording shall be subject to a separate written agreement specifying ownership, permitted uses, and compensation. The Client shall use reasonable efforts to prevent unauthorized professional recording. Customary press photography may be permitted subject to Section 25.$n$,
  1160, true,
  '[]'::jsonb
),

(
  'n_merchandise',
  'Merchandise',
  'Marketing',
  $n$The Vendor has the right to sell its merchandise at the Premises in connection with the Performance, and the Client shall provide a suitable, well-lit location. The Client's commission, if any, shall be {{merch_commission_percent}}% of net sales after taxes, or none where prohibited by law. The Vendor retains all intellectual property in its merchandise.$n$,
  1170, true,
  '[{"key":"merch_commission_percent","label":"Merch commission","default":"0","type":"number","suffix":"%"}]'::jsonb
),

(
  'n_insurance',
  'Insurance',
  'Liability',
  $n$Each Party shall maintain, at its own expense, commercial general liability insurance of not less than ${{liability_amount}} per occurrence covering its activities under this Agreement. The Client shall maintain coverage appropriate to the Premises, including public liability and, where applicable, liquor liability. On request, each Party shall furnish a certificate and, where reasonably required, name the other as an additional insured for the Engagement.$n$,
  1180, true,
  '[{"key":"liability_amount","label":"Liability per occurrence","default":"1000000","type":"number","suffix":"$"}]'::jsonb
),

(
  'n_indemnification',
  'Indemnification (Mutual)',
  'Liability',
  $n$Each Party (the "Indemnifying Party") shall indemnify, defend, and hold harmless the other Party and its officers, employees, and agents from and against any claims, damages, liabilities, and reasonable expenses (including attorneys' fees) arising out of the Indemnifying Party's negligence, willful misconduct, or breach of this Agreement. This obligation survives the Engagement.$n$,
  1190, true,
  '[]'::jsonb
),

(
  'n_force_majeure',
  'Force Majeure',
  'Force Majeure',
  $n$Neither Party is liable for failure to perform due to causes beyond its reasonable control ("Force Majeure"), including acts of God, severe weather, fire, flood, epidemic or pandemic, governmental order, civil unrest, terrorism, labor dispute, power failure, or the death or serious illness of the Vendor or a key member. The affected Party shall give prompt notice. If Force Majeure prevents the Performance, the Parties shall first attempt to reschedule in good faith; if not feasible, the Guarantee obligation is excused and any deposit shall be [returned / retained / pro-rated]: [details].$n$,
  1200, true,
  '[]'::jsonb
),

(
  'n_cancellation_rescheduling',
  'Cancellation and Rescheduling (Balanced)',
  'Cancellation',
  $n$If the Client cancels for reasons other than Force Majeure or the Vendor's uncured breach, the Client shall pay [the full Guarantee / a kill fee of [$amount or percentage]] per this schedule: [tiered schedule]. If the Vendor cancels for reasons other than Force Majeure or the Client's uncured breach, the Vendor shall promptly return any deposit and [shall / shall not] be liable for [documented damages]. The Parties may agree in writing to reschedule, in which case this Agreement governs the new date unless otherwise agreed.$n$,
  1210, true,
  '[]'::jsonb
),

(
  'n_inclement_weather',
  'Inclement Weather (Outdoor Performances)',
  'Force Majeure',
  $n$For any outdoor Performance, the Client shall make the final decision on weather-related delays or cancellation in consultation with the Vendor, with safety paramount, and shall provide adequate weather protection for the stage, equipment, and Vendor. A weather cancellation is treated as Force Majeure under Section 20 unless caused by the Client's failure to provide reasonable protection.$n$,
  1220, true,
  '[]'::jsonb
),

(
  'n_exclusivity_radius',
  'Exclusivity and Radius Clause',
  'Restrictions',
  $n$The Vendor agrees not to perform a publicly advertised engagement within {{radius_distance}} of the Premises from {{days_before_radius}} days before to {{days_after_radius}} days after the Performance, without the Client's prior written consent. This restriction is intended to protect the drawing power of the Performance and shall be construed no more broadly than necessary. [Optional carve-outs: festivals, private events, prior commitments.]$n$,
  1230, true,
  '[
    {"key":"radius_distance","label":"Radius","default":"50 miles","type":"text"},
    {"key":"days_before_radius","label":"Days before","default":"60","type":"days"},
    {"key":"days_after_radius","label":"Days after","default":"30","type":"days"}
  ]'::jsonb
),

(
  'n_conduct_compliance',
  'Conduct, Capacity, and Compliance',
  'Restrictions',
  $n$The Client shall operate the Premises in compliance with all applicable laws, permits, licenses, occupancy limits, fire codes, and noise ordinances, and shall obtain and pay for all performing-rights licenses (e.g., ASCAP, BMI, SESAC). The Client shall provide reasonable security. The Vendor shall comply with reasonable house rules and shall not engage in unlawful conduct or conduct that materially endangers persons or property. A material violation by either Party is grounds for termination under Section 27.$n$,
  1240, true,
  '[]'::jsonb
),

(
  'n_press_credentials',
  'Press and Photography Credentials',
  'Media',
  $n$Press access and photography shall be coordinated through the Vendor Representative. Credentialed photographers may be limited to the first {{press_song_limit}} songs and designated areas, without flash, unless otherwise agreed. The Vendor may approve credentialed outlets where the Vendor's name or likeness is featured prominently. This Section grants no recording right; Section 16 governs.$n$,
  1250, true,
  '[{"key":"press_song_limit","label":"Press songs limit","default":"3","type":"number","suffix":"songs"}]'::jsonb
),

(
  'n_intellectual_property',
  'Intellectual Property',
  'Media',
  $n$As between the Parties, the Vendor retains all right, title, and interest in its performances, compositions, recordings, name, likeness, logos, and other intellectual property. Nothing transfers the Vendor's intellectual property to the Client. The Client's use of the Vendor's name and likeness is a limited license solely to promote this Performance under Section 14, terminating after the Performance except for archival and incidental historical use.$n$,
  1260, true,
  '[]'::jsonb
),

(
  'n_term_default_termination',
  'Term, Default, and Termination',
  'Termination',
  $n$This Agreement takes effect on the Effective Date and continues until the Parties have fully performed, unless terminated earlier as provided. A Party is in default if it materially breaches and fails to cure within {{cure_days}} days after written notice (or immediately where cure is not feasible). The non-defaulting Party may terminate on default and pursue any remedies available at law or in equity, subject to Section 28.$n$,
  1270, true,
  '[{"key":"cure_days","label":"Cure period","default":"10","type":"days"}]'::jsonb
),

(
  'n_limitation_of_liability',
  'Limitation of Liability',
  'Liability',
  $n$Except for indemnification obligations, breaches of confidentiality, or a Party's gross negligence or willful misconduct, neither Party shall be liable to the other for indirect, incidental, consequential, special, or punitive damages, including lost profits. Each Party's aggregate liability shall not exceed [the Guarantee / a specified amount], except as required by law.$n$,
  1280, true,
  '[]'::jsonb
),

(
  'n_governing_law',
  'Dispute Resolution and Governing Law',
  'Legal',
  $n$This Agreement is governed by the laws of the State of {{governing_state}}, without regard to conflict-of-laws principles. The Parties shall first attempt good-faith negotiation, then mediation by a mutually agreed mediator. Any unresolved dispute shall be settled by [binding arbitration under the rules of [arbitral body] / the courts located in [county, state]], and the Parties consent to the exclusive jurisdiction and venue of that forum.$n$,
  1290, true,
  '[{"key":"governing_state","label":"Governing state","default":"","type":"text"}]'::jsonb
),

(
  'n_attorneys_fees',
  'Attorneys'' Fees',
  'Legal',
  $n$In any action or proceeding to enforce or interpret this Agreement, the prevailing Party shall be entitled to recover its reasonable attorneys' fees and costs, in addition to any other relief to which it may be entitled.$n$,
  1300, true,
  '[]'::jsonb
),

(
  'n_assignment',
  'Assignment and Subcontracting',
  'Legal',
  $n$Neither Party may assign this Agreement without the other's prior written consent, except that the Vendor may engage its customary band members, crew, and subcontractors to render the Performance. A permitted assignment does not relieve the assigning Party of its obligations. This Agreement binds and benefits the Parties and their permitted successors and assigns.$n$,
  1310, true,
  '[]'::jsonb
),

(
  'n_independent_contractor',
  'Independent Contractor Status',
  'Legal',
  $n$The Vendor renders the Performance as an independent contractor and not as an employee, partner, or agent of the Client. Nothing creates an employment, partnership, joint venture, or agency relationship. The Vendor is responsible for its own taxes, insurance, and benefits, and retains control over the manner and means of the Performance, subject to this Agreement.$n$,
  1320, true,
  '[]'::jsonb
),

(
  'n_confidentiality',
  'Confidentiality and Non-Disparagement',
  'Legal',
  $n$The financial terms of this Agreement are confidential and shall not be disclosed by either Party except to professional advisors, as required by law, or as necessary to perform this Agreement. Neither Party shall make public statements that materially disparage the other in connection with the Engagement. This Section survives termination.$n$,
  1330, true,
  '[]'::jsonb
),

(
  'n_notices',
  'Notices',
  'Legal',
  $n$All notices shall be in writing and delivered to the representatives in Section 1 by personal delivery, recognized overnight courier, certified mail, or email with confirmation of receipt. Notice is effective on receipt, or for email upon confirmation or the next business day, whichever is earlier. A Party may change its notice address by written notice.$n$,
  1340, true,
  '[]'::jsonb
),

(
  'n_entire_agreement',
  'Entire Agreement; Amendment; Miscellaneous',
  'Legal',
  $n$This Agreement, with its Exhibits and Riders, is the entire agreement between the Parties regarding the Engagement and supersedes all prior understandings, written or oral. It may be amended only by a writing signed by both Parties. If any provision is held invalid, the remainder remains in force and the invalid provision shall be reformed to the minimum extent necessary. No waiver of any breach is a waiver of any other breach. This Agreement may be executed in counterparts, including by electronic signature, each an original and together one instrument.$n$,
  1350, true,
  '[]'::jsonb
)

on conflict (slug) do nothing;

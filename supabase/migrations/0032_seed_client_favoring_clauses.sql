-- =====================================================================
-- Pact. — Seed clauses from Client_Favoring_Agreement.pdf
--
-- 35 clauses taken from a venue-favoring artist performance agreement.
-- Slugs are prefixed `cf_` so the whole set can be identified, listed,
-- or bulk-removed later. Content uses {{snake_case}} placeholders for
-- the [bracketed] fields in the PDF; each clause's `variables` jsonb
-- describes the keys.
--
-- Cross-references inside the text (e.g. "described in Section 5") are
-- preserved verbatim from the PDF. They are accurate only when the full
-- venue template is used in order — admins should edit them if you
-- reorder or omit clauses.
--
-- Re-runnable: ON CONFLICT (slug) DO NOTHING.
-- =====================================================================

insert into clause_library
  (slug, title, category, content, sort_order, is_active, variables)
values

(
  'cf_parties',
  'Parties and Contact Information',
  'Parties',
  $cf$The Vendor is {{vendor_legal_name}}, with a principal address at {{vendor_address}}, represented for purposes of this Agreement by {{vendor_rep_name}}, {{vendor_rep_title}} ("Vendor Representative"), reachable at {{vendor_phone}} and {{vendor_email}}. The Client is {{client_legal_name}}, with a principal address at {{client_address}}, represented by {{client_rep_name}}, {{client_rep_title}} ("Client Representative"), reachable at {{client_phone}} and {{client_email}}. For purposes of this Agreement, the Vendor is the performing artist and the Client is the venue engaging the Vendor.

Each Party designates the contact above as its authorized representative for all communications, approvals, and notices relating to this engagement. A Party may change its designated representative by written notice to the other Party.$cf$,
  10, true,
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
  'cf_recitals',
  'Recitals and Background',
  'Background',
  $cf$The Client operates a performance venue located at {{venue_name_address}} and wishes to engage the Vendor to render a live performance. The Vendor is a professional performer willing to provide such services on the terms set out below. The Parties enter into this Agreement to record their mutual understanding regarding the engagement, compensation, and respective responsibilities.$cf$,
  20, true,
  '[{"key":"venue_name_address","label":"Venue name and address","default":"","type":"text"}]'::jsonb
),

(
  'cf_definitions',
  'Definitions',
  'Background',
  $cf$In this Agreement: "Engagement" means the performance and related services described in Section 5; "Performance" means the live appearance by the Vendor on the Date(s) specified in Section 6; "Guarantee" means the fixed fee payable to the Vendor under Section 8; "Gross Box Office Receipts" means total ticket revenue actually received, less only the deductions expressly permitted in Section 8; "Rider" means the technical and hospitality requirements attached as Exhibits; and "Force Majeure" has the meaning given in Section 20.$cf$,
  30, true,
  '[]'::jsonb
),

(
  'cf_engagement',
  'Engagement',
  'Performance',
  $cf$The Client engages the Vendor, and the Vendor accepts, to render a live performance of the type described in Section 5 (the "Engagement"). The Vendor shall perform in a professional and workmanlike manner satisfactory to the Client and consistent with the standard reasonably expected by the Client. The Vendor shall comply with all reasonable directions of the Client regarding scheduling, set times, and venue operations.$cf$,
  40, true,
  '[]'::jsonb
),

(
  'cf_description_of_performance',
  'Description of Performance',
  'Performance',
  $cf$The Performance shall consist of {{number_of_sets}} set(s) totaling no less than {{performance_minutes}} minutes of performance time, exclusive of intermissions. The content shall be substantially consistent with the Vendor's promotional representations and shall be suitable for the Client's audience and venue standards. The Vendor shall include {{specified_material}} if reasonably requested by the Client. Encores shall be performed if reasonably requested by the Client and audience demand warrants.$cf$,
  50, true,
  '[
    {"key":"number_of_sets","label":"Number of sets","default":"1","type":"number"},
    {"key":"performance_minutes","label":"Minimum minutes","default":"60","type":"number","suffix":"min"},
    {"key":"specified_material","label":"Required material / headline works","default":"","type":"text"}
  ]'::jsonb
),

(
  'cf_date_time_schedule',
  'Date, Time, and Schedule',
  'Performance',
  $cf$The Performance shall take place on {{performance_date}} at the venue. The Vendor shall adhere to the schedule set by the Client, approximately: load-in {{load_in_time}}; soundcheck {{soundcheck_time}}; doors {{doors_time}}; Vendor takes stage {{stage_time}}; Performance concludes by {{end_time}}; load-out by {{load_out_time}}. Time is of the essence. The Vendor's failure to begin the Performance at the scheduled time, or to vacate by the load-out time, shall be a material breach, and the Client may reduce the Guarantee proportionately for any shortfall in performance time caused by the Vendor.$cf$,
  60, true,
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
  'cf_venue_premises',
  'Venue and Premises',
  'Performance',
  $cf$The Performance shall take place at {{venue_name}}, {{venue_address}} (the "Premises"), capacity approximately {{venue_capacity}}. The Vendor shall use the Premises in accordance with the Client's rules and shall be responsible for any damage to the Premises caused by the Vendor or its personnel, ordinary wear excepted. The Client makes no warranty as to the suitability of the Premises for the Vendor's particular requirements, which the Vendor is responsible for confirming in advance.$cf$,
  70, true,
  '[
    {"key":"venue_name","label":"Venue name","default":"","type":"text"},
    {"key":"venue_address","label":"Venue address","default":"","type":"text"},
    {"key":"venue_capacity","label":"Approx capacity","default":"","type":"number"}
  ]'::jsonb
),

(
  'cf_compensation',
  'Compensation and Payment',
  'Compensation',
  $cf$In consideration of the Performance, the Client shall pay the Vendor a guarantee of ${{guarantee_amount}} (the "Guarantee"). A deposit, if any, of {{deposit_amount}} shall be paid {{deposit_days_advance}} days in advance and shall be fully refundable to the Client if the Vendor fails to perform for any reason. The balance shall be paid within {{balance_days_after}} days following the Performance, subject to the Client's confirmation that the Vendor performed in accordance with this Agreement. The Client may deduct from any amount due the cost of remedying any breach by the Vendor.

The Vendor is responsible for all taxes on amounts it receives. All amounts are stated in {{currency}}.$cf$,
  80, true,
  '[
    {"key":"guarantee_amount","label":"Guarantee","default":"","type":"number","suffix":"$"},
    {"key":"deposit_amount","label":"Deposit ($ or %)","default":"","type":"text"},
    {"key":"deposit_days_advance","label":"Deposit due","default":"30","type":"days","suffix":"days before"},
    {"key":"balance_days_after","label":"Balance due","default":"7","type":"days","suffix":"days after"},
    {"key":"currency","label":"Currency","default":"USD","type":"text"}
  ]'::jsonb
),

(
  'cf_settlement',
  'Settlement and Accounting',
  'Compensation',
  $cf$Where compensation depends on ticket sales, the Client shall maintain records of ticket sales and deductions and shall provide a settlement statement within {{settlement_days}} days of the Performance. The Client's calculation of Gross Box Office Receipts and permitted deductions shall be final absent manifest error. Any audit requested by the Vendor shall be at the Vendor's expense.$cf$,
  90, true,
  '[{"key":"settlement_days","label":"Settlement window","default":"14","type":"days"}]'::jsonb
),

(
  'cf_technical_rider',
  'Technical Requirements (Technical Rider)',
  'Riders',
  $cf$The Client shall use reasonable efforts to provide the equipment described in the Technical Rider (Exhibit A) to the extent consistent with the Premises' existing systems. Any items not customarily available at the Premises shall be supplied at the Vendor's expense or omitted. The Vendor accepts the house systems as-is. In the event of a conflict, the body of this Agreement controls over the Technical Rider.$cf$,
  100, true,
  '[]'::jsonb
),

(
  'cf_hospitality_rider',
  'Hospitality (Hospitality Rider)',
  'Riders',
  $cf$The Client shall provide reasonable dressing-room access and water for the Vendor. Any additional hospitality items requested in Exhibit B shall be provided at the Client's discretion or at the Vendor's expense. A buyout, if offered, satisfies all hospitality obligations.$cf$,
  110, true,
  '[]'::jsonb
),

(
  'cf_equipment_production',
  'Equipment and Production',
  'Logistics',
  $cf$The Vendor is responsible for its own instruments and equipment and for any damage to the Premises or the Client's equipment caused by the Vendor or its personnel. The Client is not liable for any loss of or damage to the Vendor's equipment for any reason, and the Vendor shall insure its own equipment.$cf$,
  120, true,
  '[]'::jsonb
),

(
  'cf_travel_lodging',
  'Travel, Lodging, and Per Diems',
  'Logistics',
  $cf$The Vendor is responsible for its own travel, ground transportation, lodging, and per diems unless the Client expressly agrees otherwise in writing. Any travel or lodging the Client elects to provide is a courtesy and may be withdrawn on reasonable notice.$cf$,
  130, true,
  '[]'::jsonb
),

(
  'cf_marketing_promotion',
  'Marketing and Promotion',
  'Marketing',
  $cf$The Client controls all advertising and promotion of the Performance and may use the Vendor's name, likeness, logo, and promotional materials for that purpose without further approval. The Vendor shall provide promotional materials and shall participate in reasonable promotional activities (interviews, appearances) at the Client's request and at no additional charge.$cf$,
  140, true,
  '[]'::jsonb
),

(
  'cf_ticketing',
  'Ticketing',
  'Marketing',
  $cf$The Client has sole control over ticket pricing, scaling, on-sale timing, holds, comps, and all ticketing operations. The Client may issue complimentary and promotional tickets in its discretion. The Vendor shall receive {{vendor_comp_tickets}} complimentary tickets subject to availability and advance request. Comps and promotional admissions are excluded from any revenue calculation.$cf$,
  150, true,
  '[{"key":"vendor_comp_tickets","label":"Vendor comp tickets","default":"4","type":"number"}]'::jsonb
),

(
  'cf_recording_broadcast',
  'Recording, Broadcast, and Streaming',
  'Marketing',
  $cf$The Client may photograph, record, broadcast, and stream the Performance for archival, security, and promotional purposes, and the Vendor grants the Client a license to use such recordings to promote the Premises and future events. Any commercial exploitation by the Vendor of recordings made at the Premises requires the Client's consent.$cf$,
  160, true,
  '[]'::jsonb
),

(
  'cf_merchandise',
  'Merchandise',
  'Marketing',
  $cf$The Client shall control merchandise sales at the Premises and shall retain a commission of {{merch_commission_percent}}% of gross merchandise sales. The Client may require use of its sellers and point-of-sale system. The Vendor shall report and remit, or permit the Client to deduct, the Client's commission at settlement.$cf$,
  170, true,
  '[{"key":"merch_commission_percent","label":"Merch commission","default":"20","type":"number","suffix":"%"}]'::jsonb
),

(
  'cf_insurance',
  'Insurance',
  'Liability',
  $cf$The Vendor shall maintain commercial general liability insurance of not less than ${{liability_amount}} per occurrence and shall name the Client as an additional insured, furnishing a certificate before the Performance. The Vendor shall also maintain workers' compensation and instrument/equipment coverage. The Client may maintain such insurance as it deems appropriate for the Premises.$cf$,
  180, true,
  '[{"key":"liability_amount","label":"Liability per occurrence","default":"1000000","type":"number","suffix":"$"}]'::jsonb
),

(
  'cf_indemnification',
  'Indemnification',
  'Liability',
  $cf$The Vendor shall defend, indemnify, and hold harmless the Client and its owners, officers, employees, and agents from and against any and all claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of or relating to the Performance, the Vendor's acts or omissions, the Vendor's personnel or equipment, or the Vendor's breach of this Agreement. This obligation survives the Engagement. The Client's indemnity to the Vendor, if any, is limited to claims caused solely by the Client's gross negligence.$cf$,
  190, true,
  '[]'::jsonb
),

(
  'cf_force_majeure',
  'Force Majeure',
  'Force Majeure',
  $cf$Neither Party is liable for failure to perform due to causes beyond its reasonable control ("Force Majeure"), including acts of God, severe weather, fire, flood, epidemic, governmental order, civil unrest, or labor dispute. If a Force Majeure event prevents the Performance, the Client's payment obligation is excused and the Vendor shall promptly refund any deposit. The Client may also terminate without liability if attendance is likely to be materially impaired by such an event.$cf$,
  200, true,
  '[]'::jsonb
),

(
  'cf_cancellation_rescheduling',
  'Cancellation and Rescheduling (Venue-favored)',
  'Cancellation',
  $cf$The Client may cancel or reschedule the Performance on {{client_cancel_notice_days}} days' written notice without liability beyond returning any unearned deposit. If the Vendor cancels for any reason other than the Client's uncured material breach, the Vendor shall (i) refund any deposit, (ii) pay the Client a cancellation fee of {{vendor_cancel_fee}}, and (iii) reimburse the Client's documented out-of-pocket costs, including promotion and production already incurred.$cf$,
  210, true,
  '[
    {"key":"client_cancel_notice_days","label":"Client cancel notice","default":"7","type":"days"},
    {"key":"vendor_cancel_fee","label":"Vendor cancel fee ($ or %)","default":"","type":"text"}
  ]'::jsonb
),

(
  'cf_inclement_weather',
  'Inclement Weather (Outdoor Performances)',
  'Force Majeure',
  $cf$For any outdoor Performance, the Client has sole discretion to delay, shorten, relocate, or cancel for weather or safety, and any such decision shall be treated as Force Majeure under Section 20, with the Vendor refunding any deposit for a cancelled Performance. The Client is not required to provide weather protection beyond what it deems reasonable.$cf$,
  220, true,
  '[]'::jsonb
),

(
  'cf_exclusivity_radius',
  'Exclusivity and Radius Clause',
  'Restrictions',
  $cf$The Vendor shall not perform, announce, or advertise any engagement within {{radius_miles}} miles of the Premises during the period from {{days_before_radius}} days before to {{days_after_radius}} days after the Performance, without the Client's prior written consent. This restriction protects the Client's draw and applies to all public performances, festivals, and ticketed events.$cf$,
  230, true,
  '[
    {"key":"radius_miles","label":"Radius","default":"100","type":"number","suffix":"mi"},
    {"key":"days_before_radius","label":"Days before","default":"90","type":"days"},
    {"key":"days_after_radius","label":"Days after","default":"30","type":"days"}
  ]'::jsonb
),

(
  'cf_conduct_compliance',
  'Conduct, Capacity, and Compliance',
  'Restrictions',
  $cf$The Vendor shall comply with all of the Client's house rules, lawful directions, and applicable laws, and shall not engage in conduct that is unlawful, that endangers persons or property, or that the Client reasonably deems likely to harm its reputation or license. The Client may stop the Performance and treat any violation as a material breach. The Client is responsible for occupancy limits, permits, and performing-rights licensing as operator of the Premises.$cf$,
  240, true,
  '[]'::jsonb
),

(
  'cf_press_credentials',
  'Press and Photography Credentials',
  'Media',
  $cf$The Client controls press access and credentialing and may admit photographers and media as it sees fit for promotion of the Premises and the event. The Vendor shall reasonably cooperate with credentialed press. This Section does not grant any party the right to make a full recording, which is governed by Section 16.$cf$,
  250, true,
  '[]'::jsonb
),

(
  'cf_intellectual_property',
  'Intellectual Property',
  'Media',
  $cf$The Vendor retains ownership of its compositions and performances, but grants the Client a perpetual, royalty-free license to use the Vendor's name, likeness, and any Client-made recordings or photographs of the Performance to promote the Premises and future events. The Vendor warrants it holds all rights necessary to perform and grant this license.$cf$,
  260, true,
  '[]'::jsonb
),

(
  'cf_term_default_termination',
  'Term, Default, and Termination',
  'Termination',
  $cf$This Agreement takes effect on the Effective Date and continues until performed. The Vendor is in default upon any breach; if the breach is curable, the Vendor shall cure within {{cure_days}} days of notice, failing which the Client may terminate, withhold payment, and recover its damages and costs. The Client may terminate for convenience on {{client_terminate_notice_days}} days' notice, its only liability being return of any unearned deposit.$cf$,
  270, true,
  '[
    {"key":"cure_days","label":"Cure period","default":"5","type":"days"},
    {"key":"client_terminate_notice_days","label":"Client termination notice","default":"7","type":"days"}
  ]'::jsonb
),

(
  'cf_limitation_of_liability',
  'Limitation of Liability',
  'Liability',
  $cf$In no event shall the Client be liable to the Vendor for any indirect, incidental, consequential, special, or punitive damages, including lost profits. The Client's total aggregate liability under this Agreement shall not exceed the Guarantee actually paid. The Vendor's liability is not so limited where it arises from the Vendor's acts, omissions, or breach.$cf$,
  280, true,
  '[]'::jsonb
),

(
  'cf_governing_law',
  'Dispute Resolution and Governing Law',
  'Legal',
  $cf$This Agreement is governed by the laws of the State of {{governing_state}}. The Parties consent to the exclusive jurisdiction and venue of the state and federal courts located in {{court_venue}} for any dispute. The prevailing Party (expected to be determined in the Client's home forum) is entitled to its fees and costs.$cf$,
  290, true,
  '[
    {"key":"governing_state","label":"Governing state","default":"","type":"text"},
    {"key":"court_venue","label":"County, state for court","default":"","type":"text"}
  ]'::jsonb
),

(
  'cf_attorneys_fees',
  'Attorneys'' Fees',
  'Legal',
  $cf$In any action or proceeding to enforce or interpret this Agreement, the prevailing Party shall be entitled to recover its reasonable attorneys' fees and costs, in addition to any other relief to which it may be entitled.$cf$,
  300, true,
  '[]'::jsonb
),

(
  'cf_assignment',
  'Assignment and Subcontracting',
  'Legal',
  $cf$The Vendor may not assign this Agreement or delegate the Performance without the Client's prior written consent; the Performance is personal to the Vendor and any substitution of personnel requires the Client's approval. The Client may assign this Agreement to any successor owner or operator of the Premises.$cf$,
  310, true,
  '[]'::jsonb
),

(
  'cf_independent_contractor',
  'Independent Contractor Status',
  'Legal',
  $cf$The Vendor renders the Performance as an independent contractor and not as an employee, partner, or agent of the Client. Nothing creates an employment, partnership, joint venture, or agency relationship. The Vendor is responsible for its own taxes, insurance, and benefits, and retains control over the manner and means of the Performance, subject to this Agreement.$cf$,
  320, true,
  '[]'::jsonb
),

(
  'cf_confidentiality',
  'Confidentiality and Non-Disparagement',
  'Legal',
  $cf$The Vendor shall keep the terms of this Agreement and any non-public information about the Client confidential, and shall not make any public statement disparaging the Client. The Client may disclose terms as needed to operate and promote the event. This Section survives termination.$cf$,
  330, true,
  '[]'::jsonb
),

(
  'cf_notices',
  'Notices',
  'Legal',
  $cf$All notices shall be in writing and delivered to the representatives in Section 1 by personal delivery, recognized overnight courier, certified mail, or email with confirmation of receipt. Notice is effective on receipt, or for email upon confirmation or the next business day, whichever is earlier. A Party may change its notice address by written notice.$cf$,
  340, true,
  '[]'::jsonb
),

(
  'cf_entire_agreement',
  'Entire Agreement; Amendment; Miscellaneous',
  'Legal',
  $cf$This Agreement, with its Exhibits and Riders, is the entire agreement between the Parties regarding the Engagement and supersedes all prior understandings, written or oral. It may be amended only by a writing signed by both Parties. If any provision is held invalid, the remainder remains in force and the invalid provision shall be reformed to the minimum extent necessary. No waiver of any breach is a waiver of any other breach. This Agreement may be executed in counterparts, including by electronic signature, each an original and together one instrument.$cf$,
  350, true,
  '[]'::jsonb
)

on conflict (slug) do nothing;

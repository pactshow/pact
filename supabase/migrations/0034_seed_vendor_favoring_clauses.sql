-- =====================================================================
-- Pact. — Seed clauses from Vendor_Favoring_Agreement.pdf
--
-- Same 35-section structure as 0032 (Client-Favoring) and 0033 (Neutral),
-- but tilted toward the Artist. Slugs prefixed `vf_` so the whole vendor
-- set can be identified, listed, or bulk-removed later. Categories match
-- the other two sets so cf_/n_/vf_ siblings cluster in the picker.
--
-- Cross-references ("Section 5", "Section 14", "Section 16") are kept
-- verbatim from the PDF and assume the full vendor template is used in
-- order. Admins should edit them if you mix sets or reorder.
--
-- Re-runnable: ON CONFLICT (slug) DO NOTHING.
-- =====================================================================

insert into clause_library
  (slug, title, category, content, sort_order, is_active, variables)
values

(
  'vf_parties',
  'Parties and Contact Information',
  'Parties',
  $vf$The Vendor is {{vendor_legal_name}}, with a principal address at {{vendor_address}}, represented for purposes of this Agreement by {{vendor_rep_name}}, {{vendor_rep_title}} ("Vendor Representative"), reachable at {{vendor_phone}} and {{vendor_email}}. The Client is {{client_legal_name}}, with a principal address at {{client_address}}, represented by {{client_rep_name}}, {{client_rep_title}} ("Client Representative"), reachable at {{client_phone}} and {{client_email}}. For purposes of this Agreement, the Vendor is the performing artist and the Client is the venue engaging the Vendor.

Each Party designates the contact above as its authorized representative for all communications, approvals, and notices relating to this engagement. A Party may change its designated representative by written notice to the other Party.$vf$,
  2010, true,
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
  'vf_recitals',
  'Recitals and Background',
  'Background',
  $vf$The Client operates a performance venue located at {{venue_name_address}} and wishes to engage the Vendor to render a live performance. The Vendor is a professional performer willing to provide such services on the terms set out below. The Parties enter into this Agreement to record their mutual understanding regarding the engagement, compensation, and respective responsibilities.$vf$,
  2020, true,
  '[{"key":"venue_name_address","label":"Venue name and address","default":"","type":"text"}]'::jsonb
),

(
  'vf_definitions',
  'Definitions',
  'Background',
  $vf$In this Agreement: "Engagement" means the performance and related services described in Section 5; "Performance" means the live appearance by the Vendor on the Date(s) specified in Section 6; "Guarantee" means the fixed fee payable to the Vendor under Section 8; "Gross Box Office Receipts" means total ticket revenue actually received, less only the deductions expressly permitted in Section 8; "Rider" means the technical and hospitality requirements attached as Exhibits; and "Force Majeure" has the meaning given in Section 20.$vf$,
  2030, true,
  '[]'::jsonb
),

(
  'vf_engagement',
  'Engagement',
  'Performance',
  $vf$The Client engages the Vendor, and the Vendor accepts, to render a live performance of the type described in Section 5 (the "Engagement"). The Vendor shall perform in a professional manner consistent with the Vendor's own artistic standards, reputation, and customary style. The Vendor retains sole creative control over the manner and content of the Performance.$vf$,
  2040, true,
  '[]'::jsonb
),

(
  'vf_description_of_performance',
  'Description of Performance',
  'Performance',
  $vf$The Performance shall consist of approximately {{number_of_sets}} set(s) totaling approximately {{performance_minutes}} minutes, exclusive of intermissions and encores. The general nature, genre, and content shall be determined by the Vendor in its sole artistic discretion, consistent with the Vendor's customary repertoire. Any encore is entirely at the Vendor's discretion. The Vendor retains full creative control over the artistic content of the Performance.$vf$,
  2050, true,
  '[
    {"key":"number_of_sets","label":"Number of sets","default":"1","type":"number"},
    {"key":"performance_minutes","label":"Approx minutes","default":"60","type":"number","suffix":"min"}
  ]'::jsonb
),

(
  'vf_date_time_schedule',
  'Date, Time, and Schedule',
  'Performance',
  $vf$The Performance shall take place on {{performance_date}}. The schedule shall be as follows, subject to the Vendor's reasonable adjustment: load-in {{load_in_time}}; soundcheck {{soundcheck_time}}; doors {{doors_time}}; Vendor takes stage {{stage_time}}; Performance concludes by {{end_time}}; load-out by {{load_out_time}}. If the Client causes any delay (including late load-in, soundcheck, or doors), the Vendor may adjust or shorten the set accordingly without reduction of the Guarantee and without being in breach.$vf$,
  2060, true,
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
  'vf_venue_premises',
  'Venue and Premises',
  'Performance',
  $vf$The Performance shall take place at {{venue_name}}, {{venue_address}} (the "Premises"), capacity approximately {{venue_capacity}}. The Client represents and warrants that the Premises are properly zoned, licensed, insured, structurally sound, and fully suitable for the Performance, and that all stage, electrical, and rigging elements meet applicable safety codes. The Client shall provide the Vendor safe and unobstructed access to the stage, dressing rooms, and loading areas throughout the scheduled times.$vf$,
  2070, true,
  '[
    {"key":"venue_name","label":"Venue name","default":"","type":"text"},
    {"key":"venue_address","label":"Venue address","default":"","type":"text"},
    {"key":"venue_capacity","label":"Approx capacity","default":"","type":"number"}
  ]'::jsonb
),

(
  'vf_compensation',
  'Compensation and Payment',
  'Compensation',
  $vf$In consideration of the Performance, the Client shall pay the Vendor a guarantee of ${{guarantee_amount}} (the "Guarantee"), plus {{backend_percentage}}% of Gross Box Office Receipts in excess of ${{backend_threshold}}. A non-refundable deposit of {{deposit_amount}} is due no later than {{deposit_days_advance}} days in advance, and the balance is due in full in cash or cleared funds prior to the Vendor taking the stage. The Guarantee is payable in full regardless of attendance, weather, or audience turnout. No deduction, offset, or withholding may be applied to the Guarantee for any reason.

The Client is responsible for all taxes, levies, and withholdings other than taxes on the Vendor's net income. Late amounts accrue interest at {{late_interest_rate}}% per month. All amounts are stated in {{currency}}.$vf$,
  2080, true,
  '[
    {"key":"guarantee_amount","label":"Guarantee","default":"","type":"number","suffix":"$"},
    {"key":"backend_percentage","label":"Backend %","default":"","type":"number","suffix":"%"},
    {"key":"backend_threshold","label":"Backend threshold","default":"","type":"number","suffix":"$"},
    {"key":"deposit_amount","label":"Non-refundable deposit","default":"50%","type":"text"},
    {"key":"deposit_days_advance","label":"Deposit due","default":"30","type":"days","suffix":"days before"},
    {"key":"late_interest_rate","label":"Late interest","default":"1.5","type":"number","suffix":"%/mo"},
    {"key":"currency","label":"Currency","default":"USD","type":"text"}
  ]'::jsonb
),

(
  'vf_settlement',
  'Settlement and Accounting',
  'Compensation',
  $vf$Where compensation depends in whole or part on ticket sales, the Client shall maintain complete and accurate records and make them available to the Vendor Representative for inspection at settlement. Settlement shall occur in cash on the night of the Performance. The Vendor Representative shall have the right to be present during the box office count, to review all supporting documentation, and to audit the Client's records within {{audit_months}} months, with the Client bearing audit costs if an underpayment of {{audit_underpayment_percent}}% or more is found.$vf$,
  2090, true,
  '[
    {"key":"audit_months","label":"Audit window","default":"12","type":"number","suffix":"months"},
    {"key":"audit_underpayment_percent","label":"Underpayment trigger","default":"5","type":"number","suffix":"%"}
  ]'::jsonb
),

(
  'vf_technical_rider',
  'Technical Requirements (Technical Rider)',
  'Riders',
  $vf$The Client shall provide, at its sole cost, all sound, lighting, staging, power, and backline equipment described in the Technical Rider (Exhibit A), in good working order, together with competent technical personnel during load-in, soundcheck, the Performance, and load-out. The Technical Rider is a material term; failure to satisfy it entitles the Vendor to full payment of the Guarantee whether or not the Performance proceeds. In the event of a conflict, the Technical Rider controls.$vf$,
  2100, true,
  '[]'::jsonb
),

(
  'vf_hospitality_rider',
  'Hospitality (Hospitality Rider)',
  'Riders',
  $vf$The Client shall provide all hospitality described in the Hospitality Rider (Exhibit B), including a private, clean, secure, and climate-controlled dressing room, catering or a buyout of ${{buyout_per_person}} per person, and all specified refreshments for the Vendor and its personnel. Failure to provide the agreed hospitality does not relieve the Client of any payment obligation.$vf$,
  2110, true,
  '[{"key":"buyout_per_person","label":"Buyout per person","default":"","type":"number","suffix":"$"}]'::jsonb
),

(
  'vf_equipment_production',
  'Equipment and Production',
  'Logistics',
  $vf$Each Party is responsible for its own equipment. The Client shall provide secure storage for the Vendor's equipment while on the Premises and shall be responsible for loss of or damage to the Vendor's equipment occurring on the Premises except to the extent caused by the Vendor's own negligence. The Client shall maintain the house systems in good working order.$vf$,
  2120, true,
  '[]'::jsonb
),

(
  'vf_travel_lodging',
  'Travel, Lodging, and Per Diems',
  'Logistics',
  $vf$The Client shall provide and pay for the Vendor's travel ({{travel_class}}), ground transportation, and lodging ({{lodging_rooms}} rooms at a {{lodging_standard}}-class hotel within {{lodging_distance}} of the Premises), and shall pay per diems of ${{per_diem_amount}} per person per day in advance. The Client shall make all such arrangements to the Vendor's reasonable satisfaction.$vf$,
  2130, true,
  '[
    {"key":"travel_class","label":"Travel class","default":"economy","type":"text"},
    {"key":"lodging_rooms","label":"Rooms","default":"","type":"number"},
    {"key":"lodging_standard","label":"Hotel standard","default":"3-star","type":"text"},
    {"key":"lodging_distance","label":"Max lodging distance","default":"","type":"text"},
    {"key":"per_diem_amount","label":"Per diem","default":"75","type":"number","suffix":"$"}
  ]'::jsonb
),

(
  'vf_marketing_promotion',
  'Marketing and Promotion',
  'Marketing',
  $vf$The Client shall promote the Performance at its own cost and may use only the Vendor's approved name, likeness, logo, and materials, solely to promote this Performance. All materials featuring the Vendor are subject to the Vendor's prior written approval. The Client shall not imply the Vendor's endorsement of any product, sponsor, or third party, and shall not bill the Vendor below or above the agreed billing without consent. Any promotional appearances by the Vendor are subject to separate agreement and compensation.$vf$,
  2140, true,
  '[]'::jsonb
),

(
  'vf_ticketing',
  'Ticketing',
  'Marketing',
  $vf$Ticket prices shall be ${{ticket_price}} and shall not be changed without the Vendor's consent. The on-sale date shall be {{on_sale_date}}. The Client shall not oversell the lawful capacity and shall cap complimentary tickets at {{comp_cap}}, with comps counting toward any percentage calculation above the comp cap. The Vendor shall receive {{vendor_comp_tickets}} complimentary tickets and {{vendor_guestlist_spots}} reserved guest-list spots per Performance.$vf$,
  2150, true,
  '[
    {"key":"ticket_price","label":"Ticket price","default":"","type":"number","suffix":"$"},
    {"key":"on_sale_date","label":"On-sale date","default":"","type":"text"},
    {"key":"comp_cap","label":"Comp cap","default":"","type":"text"},
    {"key":"vendor_comp_tickets","label":"Vendor comp tickets","default":"8","type":"number"},
    {"key":"vendor_guestlist_spots","label":"Guest-list spots","default":"10","type":"number"}
  ]'::jsonb
),

(
  'vf_recording_broadcast',
  'Recording, Broadcast, and Streaming',
  'Marketing',
  $vf$No audio or visual recording, broadcast, webcast, or streaming of the Performance shall occur without the Vendor's prior written consent, and any permitted recording shall be governed by a separate written agreement specifying ownership (which shall vest in the Vendor), permitted uses, and compensation. The Client shall take reasonable steps to prevent unauthorized recording by attendees or third parties.$vf$,
  2160, true,
  '[]'::jsonb
),

(
  'vf_merchandise',
  'Merchandise',
  'Marketing',
  $vf$The Vendor has the exclusive right to sell its merchandise at the Premises with no commission payable to the Client, using its own sellers. The Client shall provide a prominent, well-lit, and secure sales location and shall not sell competing merchandise. The Vendor retains all intellectual property and all proceeds of its merchandise.$vf$,
  2170, true,
  '[]'::jsonb
),

(
  'vf_insurance',
  'Insurance',
  'Liability',
  $vf$The Client shall maintain commercial general liability insurance of not less than ${{liability_amount}} per occurrence, public liability, and (where alcohol is served) liquor liability, and shall name the Vendor as an additional insured, furnishing a certificate before the Performance. The Client's insurance is primary with respect to the Premises and its operations.$vf$,
  2180, true,
  '[{"key":"liability_amount","label":"Liability per occurrence","default":"2000000","type":"number","suffix":"$"}]'::jsonb
),

(
  'vf_indemnification',
  'Indemnification',
  'Liability',
  $vf$The Client shall defend, indemnify, and hold harmless the Vendor and its members, officers, employees, and agents from and against any and all claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of or relating to the Premises, the Client's operations, audience conduct, the sale or service of alcohol, security, or the Client's acts, omissions, or breach. This obligation survives the Engagement. The Vendor's indemnity, if any, is limited to claims caused solely by the Vendor's willful misconduct.$vf$,
  2190, true,
  '[]'::jsonb
),

(
  'vf_force_majeure',
  'Force Majeure',
  'Force Majeure',
  $vf$Neither Party is liable for failure to perform due to causes beyond its reasonable control ("Force Majeure"), including acts of God, severe weather, fire, flood, epidemic, governmental order, civil unrest, terrorism, labor dispute, power failure, or the illness of the Vendor or a key member. If Force Majeure prevents the Performance, the Parties shall first seek to reschedule; the Vendor shall retain any deposit as a credit toward the rescheduled date, and if rescheduling is not feasible, the Vendor shall retain the deposit to cover incurred costs.$vf$,
  2200, true,
  '[]'::jsonb
),

(
  'vf_cancellation_rescheduling',
  'Cancellation and Rescheduling (Artist-favored)',
  'Cancellation',
  $vf$If the Client cancels for any reason other than Force Majeure or the Vendor's uncured material breach, the Client shall pay the full Guarantee as a cancellation fee, regardless of notice given. If the Client cancels within {{client_cancel_days_short}} days of the Performance, the full Guarantee plus the Vendor's documented travel and production costs are due. The Vendor may cancel without penalty upon the Client's failure to meet any material obligation (including the Technical Rider, Hospitality Rider, or payment terms), and shall retain any deposit.$vf$,
  2210, true,
  '[{"key":"client_cancel_days_short","label":"Short-notice window","default":"30","type":"days"}]'::jsonb
),

(
  'vf_inclement_weather',
  'Inclement Weather (Outdoor Performances)',
  'Force Majeure',
  $vf$For any outdoor Performance, the Client shall provide adequate weather protection for the stage, equipment, and Vendor. The decision to proceed, delay, or cancel for weather shall be made jointly with safety paramount, and the Vendor shall not be required to perform in conditions it reasonably deems unsafe to persons or equipment. A weather cancellation does not reduce the Guarantee where the Client failed to provide adequate protection.$vf$,
  2220, true,
  '[]'::jsonb
),

(
  'vf_exclusivity_radius',
  'Exclusivity and Radius Clause',
  'Restrictions',
  $vf$The Vendor agrees only that it will not headline another publicly advertised ticketed engagement within {{radius_distance}} of the Premises within {{radius_days_window}} days before or after the Performance. The restriction does not apply to festivals, private events, prior commitments, recording, broadcast appearances, or support slots, and shall be construed narrowly.$vf$,
  2230, true,
  '[
    {"key":"radius_distance","label":"Radius","default":"15 miles","type":"text"},
    {"key":"radius_days_window","label":"Days before/after","default":"7","type":"days"}
  ]'::jsonb
),

(
  'vf_conduct_compliance',
  'Conduct, Capacity, and Compliance',
  'Restrictions',
  $vf$The Client shall operate the Premises in compliance with all laws, permits, licenses, occupancy limits, fire codes, and noise ordinances, and shall obtain and pay for all performing-rights licenses (e.g., ASCAP, BMI, SESAC). The Client shall provide security adequate for the audience and shall not interrupt or curtail the Performance except for genuine safety reasons. The Vendor's artistic choices, including content, volume within legal limits, and setlist, shall not be grounds for interference.$vf$,
  2240, true,
  '[]'::jsonb
),

(
  'vf_press_credentials',
  'Press and Photography Credentials',
  'Media',
  $vf$Press access and photography shall be coordinated through and approved by the Vendor Representative. Credentialed photographers may be limited to the first {{press_song_limit}} songs, from designated areas, without flash. The Vendor may approve or deny any outlet and may require a photo release. This Section grants no recording right; Section 16 governs.$vf$,
  2250, true,
  '[{"key":"press_song_limit","label":"Press songs limit","default":"3","type":"number","suffix":"songs"}]'::jsonb
),

(
  'vf_intellectual_property',
  'Intellectual Property',
  'Media',
  $vf$As between the Parties, the Vendor retains all right, title, and interest in its performances, compositions, recordings, name, likeness, logos, and other intellectual property. Nothing transfers any of the Vendor's intellectual property to the Client. The Client's use of the Vendor's name and likeness is a limited license solely to promote this Performance under Section 14 and terminates after the Performance, excepting incidental archival use.$vf$,
  2260, true,
  '[]'::jsonb
),

(
  'vf_term_default_termination',
  'Term, Default, and Termination',
  'Termination',
  $vf$This Agreement takes effect on the Effective Date and continues until performed. A Party is in default if it materially breaches and fails to cure within {{cure_days}} days of written notice (or immediately where cure is not feasible). On the Client's default, including any payment default or failure to meet a material obligation, the Vendor may terminate, retain all amounts paid, and recover the full Guarantee plus costs. The Client has no right to terminate for convenience.$vf$,
  2270, true,
  '[{"key":"cure_days","label":"Cure period","default":"3","type":"days"}]'::jsonb
),

(
  'vf_limitation_of_liability',
  'Limitation of Liability',
  'Liability',
  $vf$In no event shall the Vendor be liable to the Client for any indirect, incidental, consequential, special, or punitive damages, including lost profits or lost revenue from ticket sales. The Vendor's total aggregate liability under this Agreement shall not exceed the Guarantee actually received. Nothing limits the Vendor's right to recover the full Guarantee and its costs on the Client's default.$vf$,
  2280, true,
  '[]'::jsonb
),

(
  'vf_governing_law',
  'Dispute Resolution and Governing Law',
  'Legal',
  $vf$This Agreement is governed by the laws of the State of {{governing_state}}. The Parties shall attempt good-faith negotiation, then mediation. Any unresolved dispute shall be resolved by binding arbitration in {{arbitration_location}} under the rules of {{arbitral_body}}, and the Parties consent to the exclusive jurisdiction and venue of that location.$vf$,
  2290, true,
  '[
    {"key":"governing_state","label":"Vendor''s state","default":"","type":"text"},
    {"key":"arbitration_location","label":"Arbitration city, state","default":"","type":"text"},
    {"key":"arbitral_body","label":"Arbitral body","default":"AAA","type":"text"}
  ]'::jsonb
),

(
  'vf_attorneys_fees',
  'Attorneys'' Fees',
  'Legal',
  $vf$In any action or proceeding to enforce or interpret this Agreement, the prevailing Party shall be entitled to recover its reasonable attorneys' fees and costs, in addition to any other relief to which it may be entitled.$vf$,
  2300, true,
  '[]'::jsonb
),

(
  'vf_assignment',
  'Assignment and Subcontracting',
  'Legal',
  $vf$The Client may not assign this Agreement without the Vendor's prior written consent. The Vendor may engage its customary band members, crew, and subcontractors to render the Performance, and may substitute personnel of comparable ability without the Client's consent. No assignment relieves the assigning Party of its obligations.$vf$,
  2310, true,
  '[]'::jsonb
),

(
  'vf_independent_contractor',
  'Independent Contractor Status',
  'Legal',
  $vf$The Vendor renders the Performance as an independent contractor and not as an employee, partner, or agent of the Client. Nothing creates an employment, partnership, joint venture, or agency relationship. The Vendor is responsible for its own taxes, insurance, and benefits, and retains control over the manner and means of the Performance, subject to this Agreement.$vf$,
  2320, true,
  '[]'::jsonb
),

(
  'vf_confidentiality',
  'Confidentiality and Non-Disparagement',
  'Legal',
  $vf$The financial terms of this Agreement are confidential and shall not be disclosed by the Client except to its professional advisors or as required by law. Neither Party shall publicly disparage the other. The Client shall not use the Vendor's confidential business information for any purpose other than this Engagement. This Section survives termination.$vf$,
  2330, true,
  '[]'::jsonb
),

(
  'vf_notices',
  'Notices',
  'Legal',
  $vf$All notices shall be in writing and delivered to the representatives in Section 1 by personal delivery, recognized overnight courier, certified mail, or email with confirmation of receipt. Notice is effective on receipt, or for email upon confirmation or the next business day, whichever is earlier. A Party may change its notice address by written notice.$vf$,
  2340, true,
  '[]'::jsonb
),

(
  'vf_entire_agreement',
  'Entire Agreement; Amendment; Miscellaneous',
  'Legal',
  $vf$This Agreement, with its Exhibits and Riders, is the entire agreement between the Parties regarding the Engagement and supersedes all prior understandings, written or oral. It may be amended only by a writing signed by both Parties. If any provision is held invalid, the remainder remains in force and the invalid provision shall be reformed to the minimum extent necessary. No waiver of any breach is a waiver of any other breach. This Agreement may be executed in counterparts, including by electronic signature, each an original and together one instrument.$vf$,
  2350, true,
  '[]'::jsonb
)

on conflict (slug) do nothing;

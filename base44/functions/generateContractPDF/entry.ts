import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await req.json();
    if (!contract_id) {
      return Response.json({ error: 'contract_id is required' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.list();
    const contract = contracts.find(c => c.id === contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 72; // 1 inch margins
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ── helpers ──────────────────────────────────────────────────────────────

    const checkPage = (needed = 20) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const bodyText = (text, indent = 0) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(text, contentWidth - indent);
      lines.forEach(line => {
        checkPage(16);
        doc.text(line, margin + indent, y);
        y += 16;
      });
    };

    const boldText = (text, indent = 0) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(text, contentWidth - indent);
      lines.forEach(line => {
        checkPage(16);
        doc.text(line, margin + indent, y);
        y += 16;
      });
      doc.setFont('helvetica', 'normal');
    };

    const sectionHeading = (text) => {
      checkPage(30);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(text, margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
    };

    const subHeading = (text) => {
      checkPage(20);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(text, margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
    };

    const spacer = (pts = 10) => { y += pts; };

    // ── Page 1: Preamble + selected clauses ──────────────────────────────────

    // Preamble
    const effectiveDate = contract.performance_date
      ? new Date(contract.performance_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : (contract.created_date ? new Date(contract.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '___________');
    const clientName = contract.venue_name || '___________';
    const providerName = contract.artist_name || '___________';

    bodyText(
      `This Agreement ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between ${clientName} ("Client") and ${providerName} ("Service Provider"). This Agreement sets forth the terms and conditions under which Service Provider will perform certain services for Client as described herein. Client and Service Provider may each be referred to as a "Party" and collectively as the "Parties."`
    );

    spacer(14);

    // Performance details as numbered item 1
    const sections = contract.contract_sections || [];

    // Build the full list of numbered items:
    // 1. Performance details (always present)
    // 2. Payment terms (always present)
    // 3+: selected contract_sections
    // Last two: Indemnification & Escrow (always appended)

    const allItems = [];

    allItems.push({
      title: 'Performance Details',
      content: [
        `Event / Title: ${contract.title || 'N/A'}`,
        `Performance Date: ${contract.performance_date ? new Date(contract.performance_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}`,
        `Performance Time: ${contract.performance_time || 'TBD'}`,
        `Load-in / Soundcheck: ${contract.load_in_time || 'TBD'}`,
        `Set Length: ${contract.set_length || 'TBD'}`,
        `Venue: ${contract.venue_name || 'TBD'}`,
        `Venue Address: ${contract.venue_address || 'TBD'}`,
      ].join('\n')
    });

    allItems.push({
      title: 'Payment Terms',
      content: [
        `Total Amount: $${contract.total_amount ? Number(contract.total_amount).toLocaleString() : 'TBD'}`,
        contract.deposit_amount ? `Deposit: $${Number(contract.deposit_amount).toLocaleString()} due ${contract.deposit_due_date ? new Date(contract.deposit_due_date).toLocaleDateString() : 'TBD'}` : null,
        contract.total_amount && contract.deposit_amount && (contract.total_amount - contract.deposit_amount) > 0
          ? `Balance: $${(contract.total_amount - contract.deposit_amount).toLocaleString()} due ${contract.balance_due_date ? new Date(contract.balance_due_date).toLocaleDateString() : 'TBD'}` : null,
      ].filter(Boolean).join('\n')
    });

    if (contract.technical_requirements) {
      allItems.push({ title: 'Technical Requirements', content: contract.technical_requirements });
    }
    if (contract.hospitality_requirements) {
      allItems.push({ title: 'Hospitality Requirements', content: contract.hospitality_requirements });
    }
    if (contract.additional_terms) {
      allItems.push({ title: 'Additional Terms', content: contract.additional_terms });
    }

    // User-selected contract sections
    for (const s of sections) {
      allItems.push({ title: s.title, content: s.content });
    }

    // Render numbered items
    allItems.forEach((item, idx) => {
      const num = idx + 1;
      checkPage(40);
      boldText(`${num}.  ${item.title}`);
      if (item.content) {
        item.content.split('\n').forEach(line => {
          bodyText(line.trim(), 20);
        });
      }
      spacer(6);
    });

    // ── Indemnification section ───────────────────────────────────────────────
    doc.addPage();
    y = margin;

    sectionHeading('INDEMNIFICATION; LIMITATION OF LIABILITY; NO THIRD-PARTY LIABILITY');

    subHeading('(a) Role of LiveWork Management LLC.');
    bodyText('The Parties expressly acknowledge and agree that LiveWork Management LLC ("Platform") acts solely as an independent intermediary facilitating contract execution, administrative coordination, and/or payment processing between the Parties. The Platform is not a party to the underlying transaction, performance, or agreement between the Parties and assumes no responsibility for the acts, omissions, performance, or non-performance of either Party or any third party.');

    subHeading('(b) Mutual Indemnification.');
    bodyText('Each Party (the "Indemnifying Party") shall defend, indemnify, and hold harmless the Platform and its owners, members, managers, officers, directors, employees, contractors, agents, successors, and assigns (collectively, the "Platform Indemnitees") from and against any and all claims, demands, actions, damages, losses, liabilities, judgments, settlements, penalties, fines, costs, and expenses (including reasonable attorneys\' fees and legal costs) arising out of or relating to:');
    spacer(4);
    bodyText('(i) such Party\'s breach of this Agreement;', 20);
    bodyText('(ii) such Party\'s acts or omissions, including negligence or willful misconduct;', 20);
    bodyText('(iii) the performance or non-performance of services by such Party;', 20);
    bodyText('(iv) any dispute between the Parties or involving any third party in connection with the subject matter of this Agreement; or', 20);
    bodyText('(v) such Party\'s violation of any applicable law, rule, or regulation.', 20);

    subHeading('(c) Third-Party Claims.');
    bodyText('Each Party further agrees to indemnify, defend, and hold harmless the Platform Indemnitees from any and all claims brought by third parties (including, without limitation, venue staff, attendees, contractors, vendors, or affiliates) arising out of or related in any way to the Parties\' relationship, activities, or transactions contemplated under this Agreement.');

    subHeading('(d) Duty to Defend; Control of Defense.');
    bodyText('The Indemnifying Party shall assume the full defense of any claim subject to indemnification under this Section immediately upon written notice from the Platform. The Platform shall have the right, at its sole discretion, to participate in the defense with counsel of its choosing at the Indemnifying Party\'s expense. The Indemnifying Party shall not settle any claim in a manner that imposes any liability, obligation, or admission of fault on the Platform without the Platform\'s prior written consent.');

    subHeading('(e) Waiver of Claims Against Platform.');
    bodyText('To the fullest extent permitted by law, each Party hereby irrevocably waives, releases, and discharges the Platform Indemnitees from any and all claims, demands, causes of action, damages, or liabilities of any kind, whether known or unknown, arising out of or relating to any dispute between the Parties or any third party connected to this Agreement.');

    subHeading('(f) Limitation of Liability.');
    bodyText('To the fullest extent permitted by law, in no event shall the Platform Indemnitees be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to lost profits, lost revenue, or reputational harm, even if advised of the possibility of such damages. The total aggregate liability of the Platform Indemnitees, if any, shall in all circumstances be limited to the total fees actually received by the Platform in connection with this Agreement.');

    subHeading('(g) No Joint Liability.');
    bodyText('Nothing in this Agreement shall be construed to create any partnership, joint venture, agency, or fiduciary relationship between the Platform and either Party. The Platform shall have no joint or several liability with respect to any obligations of the Parties.');

    subHeading('(h) Survival.');
    bodyText('This Section shall survive the termination or expiration of this Agreement indefinitely.');

    // ── Escrow section ────────────────────────────────────────────────────────
    checkPage(60);
    sectionHeading('ESCROW; PAYMENT FACILITATION; NO FIDUCIARY DUTY');

    subHeading('(a) Limited Role of Platform.');
    bodyText('The Parties acknowledge and agree that LiveWork Management LLC ("Platform") may facilitate the collection and disbursement of payments between the Parties (the "Escrow Services") solely as a ministerial and administrative function. The Platform is not a bank, trust company, licensed escrow agent, or fiduciary, and does not provide legal, financial, or escrow advisory services.');

    subHeading('(b) No Fiduciary Relationship.');
    bodyText('The Parties expressly agree that the Platform does not act as a fiduciary, trustee, or agent for either Party. Funds held by the Platform, if any, are held solely for the limited purpose of facilitating payment in accordance with the instructions provided by the Parties and do not create any trust, fiduciary obligation, or special relationship of any kind.');

    subHeading('(c) Payment Instructions.');
    bodyText('The Platform shall disburse funds strictly in accordance with the payment terms and conditions set forth in this Agreement and any mutually agreed written instructions provided by the Parties through the Platform. The Platform shall have no obligation to independently verify performance, completion of services, or satisfaction of contractual conditions unless expressly agreed in writing.');

    subHeading('(d) Disputed Funds.');
    bodyText('In the event of any dispute between the Parties regarding entitlement to funds, the Platform may, in its sole discretion:');
    spacer(4);
    bodyText('(i) suspend or delay disbursement of the disputed funds;', 20);
    bodyText('(ii) continue to hold such funds until the Parties provide joint written instructions; or', 20);
    bodyText('(iii) release funds in accordance with a final, non-appealable court order or binding arbitration decision.', 20);
    spacer(6);
    bodyText('The Platform shall have no liability to either Party for any delay or refusal to disburse funds in connection with a dispute.');

    subHeading('(e) Interpleader Rights.');
    bodyText('The Platform reserves the right, at its sole discretion, to deposit any disputed funds with a court of competent jurisdiction and initiate an interpleader action. All costs, including attorneys\' fees, incurred by the Platform in connection with such action shall be reimbursed by the Parties on a joint and several basis.');

    subHeading('(f) Limitation of Liability for Escrow Services.');
    bodyText('To the fullest extent permitted by law, the Platform shall not be liable for any loss, claim, or damage arising out of or related to the Escrow Services, including but not limited to delays in payment, failure of a Party to perform, errors in instructions provided by the Parties, or actions taken in good faith reliance on such instructions.');

    subHeading('(g) Fees.');
    bodyText('The Platform may charge service or transaction fees for the Escrow Services, which may be deducted from funds held or billed separately, as disclosed to the Parties.');

    subHeading('(h) Compliance with Payment Processors.');
    bodyText('All funds processed through the Platform may be transmitted via third-party payment processors, banks, or ACH networks. The Parties agree to comply with all applicable terms, rules, and requirements of such third parties. The Platform shall not be liable for any acts or omissions of such third-party providers.');

    subHeading('(i) Survival.');
    bodyText('This Section shall survive termination or expiration of this Agreement.');

    // ── Signature Page ────────────────────────────────────────────────────────
    // Always put signatures on their own page for clean presentation
    doc.addPage();
    y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Signatures', margin, y);
    y += 36;

    // Two-column layout: Client (left) | Service Provider (right)
    const colWidth = (contentWidth - 40) / 2;
    const col2X = margin + colWidth + 40;

    // Labels
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Client', margin, y);
    doc.text('Service Provider', col2X, y);
    y += 30;

    // Signature lines
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.75);
    doc.line(margin, y, margin + colWidth, y);
    doc.line(col2X, y, col2X + colWidth, y);

    // Apply signatures if signed — printed just above the line
    const sigY = y - 8;

    if (contract.venue_signature) {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(14);
      doc.setTextColor(20, 80, 200);
      doc.text(contract.venue_signature, margin, sigY);
    }

    if (contract.artist_signature) {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(14);
      doc.setTextColor(20, 80, 200);
      doc.text(contract.artist_signature, col2X, sigY);
    }

    y += 24;

    // Date labels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Date', margin, y);
    doc.text('Date', col2X, y);
    y += 30;

    // Date lines
    doc.line(margin, y, margin + colWidth, y);
    doc.line(col2X, y, col2X + colWidth, y);

    // Fill in signed dates if available
    const dateSigY = y - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    if (contract.venue_signed_date) {
      doc.text(new Date(contract.venue_signed_date).toLocaleDateString(), margin, dateSigY);
    }
    if (contract.artist_signed_date) {
      doc.text(new Date(contract.artist_signed_date).toLocaleDateString(), col2X, dateSigY);
    }

    // Verification footnote if signed
    y += 36;
    if (contract.artist_signature || contract.venue_signature) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Signatures applied via biometric verification through Pact. platform.', margin, y);
      y += 12;
      doc.text(`Contract ID: ${contract_id}`, margin, y);
    }

    // ── Return as base64 data URI (open directly in browser) ─────────────────
    const pdfDataUri = doc.output('datauristring');

    return Response.json({ success: true, pdf_url: pdfDataUri });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
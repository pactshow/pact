import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsPDF } from 'npm:jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { contract_id } = await req.json();
    if (!contract_id) {
      return json({ error: 'contract_id is required' }, 400);
    }

    // RLS ensures the user can only read contracts they're a participant in.
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      return json({ error: 'Contract not found' }, 404);
    }

    const pdfDataUri = renderContractPdf(contract, contract_id);
    return json({ success: true, pdf_url: pdfDataUri });
  } catch (err) {
    console.error('generateContractPDF error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function renderContractPdf(contract: Record<string, unknown>, contractId: string): string {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const bodyText = (text: string, indent = 0) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPage(16);
      doc.text(line, margin + indent, y);
      y += 16;
    });
  };

  const boldText = (text: string, indent = 0) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPage(16);
      doc.text(line, margin + indent, y);
      y += 16;
    });
    doc.setFont('helvetica', 'normal');
  };

  const sectionHeading = (text: string) => {
    checkPage(30);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
  };

  const subHeading = (text: string) => {
    checkPage(20);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
  };

  const spacer = (pts = 10) => {
    y += pts;
  };

  const fmtDate = (d: unknown) =>
    d
      ? new Date(String(d)).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '___________';

  const c = contract as Record<string, any>;

  const effectiveDate = fmtDate(c.performance_date ?? c.created_at);
  const clientName = c.client_name || '___________';
  const providerName = c.contractor_name || '___________';

  bodyText(
    `This Agreement ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between ${clientName} ("Client") and ${providerName} ("Service Provider"). This Agreement sets forth the terms and conditions under which Service Provider will perform certain services for Client as described herein. Client and Service Provider may each be referred to as a "Party" and collectively as the "Parties."`,
  );

  spacer(14);

  const sections: Array<{ title: string; content: string }> = Array.isArray(c.contract_sections)
    ? c.contract_sections
    : [];

  const allItems: Array<{ title: string; content: string }> = [];

  allItems.push({
    title: 'Performance Details',
    content: [
      `Event / Title: ${c.title || 'N/A'}`,
      `Performance Date: ${
        c.performance_date
          ? new Date(c.performance_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'TBD'
      }`,
      `Performance Time: ${c.performance_time || 'TBD'}`,
      `Load-in / Soundcheck: ${c.load_in_time || 'TBD'}`,
      `Set Length: ${c.set_length || 'TBD'}`,
      `Client: ${c.client_name || 'TBD'}`,
      `Location: ${c.client_address || 'TBD'}`,
    ].join('\n'),
  });

  const total = c.total_amount != null ? Number(c.total_amount) : null;
  const deposit = c.deposit_amount != null ? Number(c.deposit_amount) : null;
  const balance = total != null && deposit != null ? total - deposit : null;

  allItems.push({
    title: 'Payment Terms',
    content: [
      `Total Amount: $${total != null ? total.toLocaleString() : 'TBD'}`,
      deposit != null
        ? `Deposit: $${deposit.toLocaleString()} due ${
            c.deposit_due_date ? new Date(c.deposit_due_date).toLocaleDateString() : 'TBD'
          }`
        : null,
      balance != null && balance > 0
        ? `Balance: $${balance.toLocaleString()} due ${
            c.balance_due_date ? new Date(c.balance_due_date).toLocaleDateString() : 'TBD'
          }`
        : null,
    ].filter(Boolean).join('\n'),
  });

  if (c.technical_requirements) {
    allItems.push({ title: 'Technical Requirements', content: c.technical_requirements });
  }
  if (c.hospitality_requirements) {
    allItems.push({ title: 'Hospitality Requirements', content: c.hospitality_requirements });
  }
  if (c.additional_terms) {
    allItems.push({ title: 'Additional Terms', content: c.additional_terms });
  }

  for (const s of sections) {
    if (s?.title && s?.content) {
      allItems.push({ title: s.title, content: s.content });
    }
  }

  allItems.forEach((item, idx) => {
    const num = idx + 1;
    checkPage(40);
    boldText(`${num}.  ${item.title}`);
    if (item.content) {
      item.content.split('\n').forEach((line) => {
        bodyText(line.trim(), 20);
      });
    }
    spacer(6);
  });

  doc.addPage();
  y = margin;

  sectionHeading('INDEMNIFICATION; LIMITATION OF LIABILITY; NO THIRD-PARTY LIABILITY');

  subHeading('(a) Role of LiveWork Management LLC.');
  bodyText(
    `The Parties expressly acknowledge and agree that LiveWork Management LLC ("Platform") acts solely as an independent intermediary facilitating contract execution, administrative coordination, and/or payment processing between the Parties. The Platform is not a party to the underlying transaction, performance, or agreement between the Parties and assumes no responsibility for the acts, omissions, performance, or non-performance of either Party or any third party.`,
  );

  subHeading('(b) Mutual Indemnification.');
  bodyText(
    `Each Party (the "Indemnifying Party") shall defend, indemnify, and hold harmless the Platform and its owners, members, managers, officers, directors, employees, contractors, agents, successors, and assigns (collectively, the "Platform Indemnitees") from and against any and all claims, demands, actions, damages, losses, liabilities, judgments, settlements, penalties, fines, costs, and expenses (including reasonable attorneys' fees and legal costs) arising out of or relating to:`,
  );
  spacer(4);
  bodyText("(i) such Party's breach of this Agreement;", 20);
  bodyText("(ii) such Party's acts or omissions, including negligence or willful misconduct;", 20);
  bodyText('(iii) the performance or non-performance of services by such Party;', 20);
  bodyText(
    '(iv) any dispute between the Parties or involving any third party in connection with the subject matter of this Agreement; or',
    20,
  );
  bodyText("(v) such Party's violation of any applicable law, rule, or regulation.", 20);

  subHeading('(c) Third-Party Claims.');
  bodyText(
    `Each Party further agrees to indemnify, defend, and hold harmless the Platform Indemnitees from any and all claims brought by third parties (including, without limitation, venue staff, attendees, contractors, vendors, or affiliates) arising out of or related in any way to the Parties' relationship, activities, or transactions contemplated under this Agreement.`,
  );

  subHeading('(d) Duty to Defend; Control of Defense.');
  bodyText(
    `The Indemnifying Party shall assume the full defense of any claim subject to indemnification under this Section immediately upon written notice from the Platform. The Platform shall have the right, at its sole discretion, to participate in the defense with counsel of its choosing at the Indemnifying Party's expense. The Indemnifying Party shall not settle any claim in a manner that imposes any liability, obligation, or admission of fault on the Platform without the Platform's prior written consent.`,
  );

  subHeading('(e) Waiver of Claims Against Platform.');
  bodyText(
    `To the fullest extent permitted by law, each Party hereby irrevocably waives, releases, and discharges the Platform Indemnitees from any and all claims, demands, causes of action, damages, or liabilities of any kind, whether known or unknown, arising out of or relating to any dispute between the Parties or any third party connected to this Agreement.`,
  );

  subHeading('(f) Limitation of Liability.');
  bodyText(
    `To the fullest extent permitted by law, in no event shall the Platform Indemnitees be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to lost profits, lost revenue, or reputational harm, even if advised of the possibility of such damages. The total aggregate liability of the Platform Indemnitees, if any, shall in all circumstances be limited to the total fees actually received by the Platform in connection with this Agreement.`,
  );

  subHeading('(g) No Joint Liability.');
  bodyText(
    `Nothing in this Agreement shall be construed to create any partnership, joint venture, agency, or fiduciary relationship between the Platform and either Party. The Platform shall have no joint or several liability with respect to any obligations of the Parties.`,
  );

  subHeading('(h) Survival.');
  bodyText('This Section shall survive the termination or expiration of this Agreement indefinitely.');

  checkPage(60);
  sectionHeading('ESCROW; PAYMENT FACILITATION; NO FIDUCIARY DUTY');

  subHeading('(a) Limited Role of Platform.');
  bodyText(
    `The Parties acknowledge and agree that LiveWork Management LLC ("Platform") may facilitate the collection and disbursement of payments between the Parties (the "Escrow Services") solely as a ministerial and administrative function. The Platform is not a bank, trust company, licensed escrow agent, or fiduciary, and does not provide legal, financial, or escrow advisory services.`,
  );

  subHeading('(b) No Fiduciary Relationship.');
  bodyText(
    `The Parties expressly agree that the Platform does not act as a fiduciary, trustee, or agent for either Party. Funds held by the Platform, if any, are held solely for the limited purpose of facilitating payment in accordance with the instructions provided by the Parties and do not create any trust, fiduciary obligation, or special relationship of any kind.`,
  );

  subHeading('(c) Payment Instructions.');
  bodyText(
    `The Platform shall disburse funds strictly in accordance with the payment terms and conditions set forth in this Agreement and any mutually agreed written instructions provided by the Parties through the Platform. The Platform shall have no obligation to independently verify performance, completion of services, or satisfaction of contractual conditions unless expressly agreed in writing.`,
  );

  subHeading('(d) Disputed Funds.');
  bodyText(
    `In the event of any dispute between the Parties regarding entitlement to funds, the Platform may, in its sole discretion:`,
  );
  spacer(4);
  bodyText('(i) suspend or delay disbursement of the disputed funds;', 20);
  bodyText('(ii) continue to hold such funds until the Parties provide joint written instructions; or', 20);
  bodyText(
    '(iii) release funds in accordance with a final, non-appealable court order or binding arbitration decision.',
    20,
  );
  spacer(6);
  bodyText('The Platform shall have no liability to either Party for any delay or refusal to disburse funds in connection with a dispute.');

  subHeading('(e) Interpleader Rights.');
  bodyText(
    `The Platform reserves the right, at its sole discretion, to deposit any disputed funds with a court of competent jurisdiction and initiate an interpleader action. All costs, including attorneys' fees, incurred by the Platform in connection with such action shall be reimbursed by the Parties on a joint and several basis.`,
  );

  subHeading('(f) Limitation of Liability for Escrow Services.');
  bodyText(
    `To the fullest extent permitted by law, the Platform shall not be liable for any loss, claim, or damage arising out of or related to the Escrow Services, including but not limited to delays in payment, failure of a Party to perform, errors in instructions provided by the Parties, or actions taken in good faith reliance on such instructions.`,
  );

  subHeading('(g) Fees.');
  bodyText(
    `The Platform may charge service or transaction fees for the Escrow Services, which may be deducted from funds held or billed separately, as disclosed to the Parties.`,
  );

  subHeading('(h) Compliance with Payment Processors.');
  bodyText(
    `All funds processed through the Platform may be transmitted via third-party payment processors, banks, or ACH networks. The Parties agree to comply with all applicable terms, rules, and requirements of such third parties. The Platform shall not be liable for any acts or omissions of such third-party providers.`,
  );

  subHeading('(i) Survival.');
  bodyText('This Section shall survive termination or expiration of this Agreement.');

  doc.addPage();
  y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text('Signatures', margin, y);
  y += 36;

  const colWidth = (contentWidth - 40) / 2;
  const col2X = margin + colWidth + 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Client', margin, y);
  doc.text('Service Provider', col2X, y);
  y += 30;

  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.75);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(col2X, y, col2X + colWidth, y);

  const sigY = y - 8;

  if (c.client_signature) {
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(14);
    doc.setTextColor(20, 80, 200);
    doc.text(String(c.client_signature), margin, sigY);
  }

  if (c.contractor_signature) {
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(14);
    doc.setTextColor(20, 80, 200);
    doc.text(String(c.contractor_signature), col2X, sigY);
  }

  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Date', margin, y);
  doc.text('Date', col2X, y);
  y += 30;

  doc.line(margin, y, margin + colWidth, y);
  doc.line(col2X, y, col2X + colWidth, y);

  const dateSigY = y - 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  if (c.client_signed_date) {
    doc.text(new Date(c.client_signed_date).toLocaleDateString(), margin, dateSigY);
  }
  if (c.contractor_signed_date) {
    doc.text(new Date(c.contractor_signed_date).toLocaleDateString(), col2X, dateSigY);
  }

  y += 36;
  if (c.contractor_signature || c.client_signature) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Signatures applied via biometric verification through Pact. platform.', margin, y);
    y += 12;
    doc.text(`Contract ID: ${contractId}`, margin, y);
  }

  return doc.output('datauristring');
}

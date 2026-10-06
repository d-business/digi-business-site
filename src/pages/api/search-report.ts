// Save as: src/pages/api/search-report.ts
// Handles the "free search demand report" request form. Same email setup as
// /api/contact (send_email binding "SEB", verified destination will@digi-business.co.uk).
// Unlike /api/contact, errors redirect back to the form page with ?error=... so the
// visitor sees a friendly message instead of a bare text response.

import type { APIRoute } from 'astro';
import { EmailMessage } from 'cloudflare:email';
import { env } from 'cloudflare:workers';
import { createMimeMessage, Mailbox } from 'mimetext';

export const prerender = false;

const PAGE = '/free-search-demand-report';
const clean = (value: FormDataEntryValue | null, max: number) =>
  String(value ?? '').replace(/\r/g, '').trim().slice(0, max);
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  // Honeypot: real visitors never see or fill this field. Bots often do.
  if (clean(form.get('website'), 200)) {
    return redirect(`${PAGE}?sent=true`, 303);
  }

  const name = oneLine(clean(form.get('name'), 120));
  const email = oneLine(clean(form.get('email'), 200));
  const business = oneLine(clean(form.get('business'), 160));
  const domain = oneLine(clean(form.get('domain'), 200));
  const competitors = [form.get('competitor1'), form.get('competitor2'), form.get('competitor3')]
    .map((c) => oneLine(clean(c, 200)))
    .filter(Boolean);
  const message = clean(form.get('message'), 3000);

  if (!name || !email || !business || !domain) {
    return redirect(`${PAGE}?error=missing`, 303);
  }
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) {
    return redirect(`${PAGE}?error=email`, 303);
  }
  const safeName = name.replace(/["<>]/g, ' ').trim();

  const msg = createMimeMessage();
  msg.setSender({ name: 'Digital Business Website', addr: 'noreply@digi-business.co.uk' });
  msg.setRecipient('will@digi-business.co.uk');
  msg.setHeader('Reply-To', new Mailbox({ name: safeName, addr: email }));
  msg.setSubject(`Search demand report request: ${business}`);
  msg.addMessage({
    contentType: 'text/plain',
    data: [
      'Free search demand report request',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Business: ${business}`,
      `Domain/URL: ${domain}`,
      '',
      'Competitors:',
      ...(competitors.length ? competitors.map((c, i) => `${i + 1}. ${c}`) : ['(none given)']),
      '',
      'Message:',
      message || '(none)',
    ].join('\n'),
  });

  const emailMessage = new (EmailMessage as any)(
    'noreply@digi-business.co.uk',
    'will@digi-business.co.uk',
    msg.asRaw()
  );

  try {
    await (env as any).SEB.send(emailMessage);
  } catch (err) {
    console.error('Search report request email failed:', err);
    return redirect(`${PAGE}?error=send`, 303);
  }

  return redirect(`${PAGE}?sent=true`, 303);
};

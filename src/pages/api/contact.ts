// Save as: src/pages/api/contact.ts
// Requires: @astrojs/cloudflare adapter, a "send_email" binding named SEB in
// wrangler.jsonc, Email Routing enabled on digi-business.co.uk, and
// will@digi-business.co.uk verified as a destination address in the
// Cloudflare dashboard (Email Routing > Destination addresses).
//
// Also requires the `mimetext` package: npm install mimetext

import type { APIRoute } from 'astro';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const business = String(form.get('business') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();

  if (!name || !email || !message) {
    return new Response('Missing required fields', { status: 400 });
  }

  const msg = createMimeMessage();
  // NOTE: sender address must be on the digi-business.co.uk domain
  // (the domain with Email Routing active) — it does not need to be a
  // real inbox, but it must match the verified sending domain.
  msg.setSender({ name: 'Digital Business Website', addr: 'noreply@digi-business.co.uk' });
  msg.setRecipient('will@digi-business.co.uk');
  msg.setSubject(`New enquiry from ${name}${business ? ' (' + business + ')' : ''}`);
  msg.addMessage({
    contentType: 'text/plain',
    data: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Business: ${business || 'n/a'}`,
      '',
      'Message:',
      message,
    ].join('\n'),
  });

  const emailMessage = new (EmailMessage as any)(
    'noreply@digi-business.co.uk',
    'will@digi-business.co.uk',
    msg.asRaw()
  );

  try {
    // "SEB" must match the binding name in wrangler.jsonc's send_email array
    const runtime = (locals as any).runtime;
    await runtime.env.SEB.send(emailMessage);
  } catch (err) {
    console.error('Email send failed:', err);
    return new Response('Could not send message. Please email will@digi-business.co.uk directly.', {
      status: 502,
    });
  }

  return redirect('/contact?sent=true', 303);
};

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const MIN_RENDER_AGE_MS = 3000;
const MAX_FIELD_LEN = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactPayload {
	name?: unknown;
	email?: unknown;
	phone?: unknown;
	subject?: unknown;
	message?: unknown;
	website?: unknown;
	renderedAt?: unknown;
}

const ok = () =>
	new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});

const fail = (status: number, error = 'invalid') =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// Strip CR/LF to prevent header injection in fields that end up in the
// Subject or display-name segments of the outgoing message.
const sanitizeHeader = (v: string) => v.replace(/[\r\n]+/g, ' ').slice(0, 200);

const escapeHtml = (v: string) =>
	v
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

export const POST: APIRoute = async ({ request }) => {
	let body: ContactPayload;
	try {
		body = (await request.json()) as ContactPayload;
	} catch {
		return fail(400);
	}

	// Honeypot
	if (trim(body.website).length > 0) return fail(400);

	// Time trap
	const renderedAt = Number(body.renderedAt);
	if (
		!Number.isFinite(renderedAt) ||
		Date.now() - renderedAt < MIN_RENDER_AGE_MS
	) {
		return fail(400);
	}

	const name = trim(body.name).slice(0, MAX_FIELD_LEN);
	const email = trim(body.email).slice(0, MAX_FIELD_LEN);
	const phone = trim(body.phone).slice(0, MAX_FIELD_LEN);
	const subject = trim(body.subject).slice(0, MAX_FIELD_LEN);
	const message = trim(body.message).slice(0, MAX_FIELD_LEN);

	if (!name || !email || !message) return fail(400);
	if (!EMAIL_RE.test(email)) return fail(400);

	const apiKey = import.meta.env.RESEND_API_KEY;
	const fromEmail = import.meta.env.CONTACT_FROM_EMAIL;
	const toEmail = import.meta.env.CONTACT_TO_EMAIL;

	if (!apiKey || !fromEmail || !toEmail) {
		if (import.meta.env.DEV) {
			console.info('[contact] Resend not configured; logging payload only.', {
				name,
				email,
				phone,
				subject,
				message,
			});
			return ok();
		}
		console.error(
			'[contact] Missing RESEND_API_KEY / CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL.',
		);
		return fail(503, 'misconfigured');
	}

	const resend = new Resend(apiKey);

	const subjectLine = sanitizeHeader(
		subject ? `[Noima Contact] ${subject}` : '[Noima Contact] Mesaj nou',
	);

	const lines = [
		`Nume: ${name}`,
		`Email: ${email}`,
		phone ? `Telefon: ${phone}` : null,
		subject ? `Subiect: ${subject}` : null,
		'',
		'Mesaj:',
		message,
	].filter((l): l is string => l !== null);

	const text = lines.join('\n');
	const html = `
		<table style="font-family:system-ui,sans-serif;font-size:14px;color:#000;border-collapse:collapse;">
			<tr><td style="padding:4px 12px 4px 0;color:#666;">Nume</td><td style="padding:4px 0;">${escapeHtml(name)}</td></tr>
			<tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;">${escapeHtml(email)}</td></tr>
			${phone ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Telefon</td><td style="padding:4px 0;">${escapeHtml(phone)}</td></tr>` : ''}
			${subject ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Subiect</td><td style="padding:4px 0;">${escapeHtml(subject)}</td></tr>` : ''}
		</table>
		<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
		<pre style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap;margin:0;">${escapeHtml(message)}</pre>
	`;

	try {
		const { error } = await resend.emails.send({
			from: fromEmail,
			to: [toEmail],
			replyTo: email,
			subject: subjectLine,
			text,
			html,
		});

		if (error) {
			console.error('[contact] Resend error', error);
			return fail(502, 'send_failed');
		}

		return ok();
	} catch (err) {
		console.error('[contact] Resend threw', err);
		return fail(502, 'send_failed');
	}
};

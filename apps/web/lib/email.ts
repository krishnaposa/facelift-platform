import { formatUsdWhole } from '@/lib/format-currency';

type SendBidAcceptedParams = {
  to: string;
  projectTitle: string;
  bidAmount: number;
  daysToComplete: number;
  /** Absolute origin for links, e.g. https://app.example.com */
  appOrigin: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Notify the winning contractor that their bid was accepted.
 * Uses Resend (https://resend.com) when `RESEND_API_KEY` is set.
 * Set `EMAIL_FROM` to a verified sender, e.g. `Facelift <noreply@yourdomain.com>`.
 */
export async function sendBidAcceptedEmailToContractor(
  params: SendBidAcceptedParams
): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || 'Facelift <onboarding@resend.dev>';

  const dashboardUrl = `${params.appOrigin.replace(/\/$/, '')}/dashboard/contractor`;
  const subject = `Your bid was accepted: ${params.projectTitle}`;
  const amount = formatUsdWhole(params.bidAmount);
  const text = [
    `Good news — a homeowner has accepted your bid.`,
    ``,
    `Project: ${params.projectTitle}`,
    `Bid amount: ${amount}`,
    `Timeline: ${params.daysToComplete} day${params.daysToComplete === 1 ? '' : 's'} to complete`,
    ``,
    `Log in to your contractor dashboard:`,
    dashboardUrl,
    ``,
    `— Facelift`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <p>Good news — a homeowner has accepted your bid.</p>
  <p><strong>Project:</strong> ${escapeHtml(params.projectTitle)}</p>
  <p><strong>Bid amount:</strong> ${escapeHtml(amount)}</p>
  <p><strong>Timeline:</strong> ${params.daysToComplete} day${params.daysToComplete === 1 ? '' : 's'} to complete</p>
  <p><a href="${escapeHtml(dashboardUrl)}">Open contractor dashboard</a></p>
  <p style="color: #64748b; font-size: 14px;">— Facelift</p>
</body>
</html>`.trim();

  if (!key) {
    console.warn('[email] RESEND_API_KEY is not set; skipping bid acceptance email.');
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] Resend error', res.status, body);
      return { sent: false, error: 'Email send failed' };
    }

    return { sent: true };
  } catch (e) {
    console.error('[email] Resend request failed', e);
    return { sent: false, error: 'Email send failed' };
  }
}

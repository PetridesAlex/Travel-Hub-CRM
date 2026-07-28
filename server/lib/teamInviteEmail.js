function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function getAppBaseUrl() {
  const fromEnv =
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    process.env.CRM_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return String(fromEnv || 'https://travel-hub-crm.vercel.app').replace(/\/$/, '')
}

export function resolveInviteLogoAbsoluteUrl(agency, appUrl = getAppBaseUrl()) {
  const logo = agency?.logo_url
  if (logo?.startsWith('http://') || logo?.startsWith('https://')) return logo
  if (logo?.startsWith('/')) return `${appUrl}${logo}`
  if (/honeywell/i.test(agency?.name || '')) {
    return `${appUrl}/logos/honeywell-travel.png`
  }
  return null
}

function roleLabel(role) {
  if (role === 'admin') return 'Administrator'
  if (role === 'agent') return 'Travel Agent'
  return String(role || 'Team member')
}

/**
 * Premium HTML invite for agency team members (Resend).
 */
export function buildTeamInviteEmailHtml({
  agencyName,
  logoUrl,
  inviteUrl,
  displayName,
  role,
  inviterEmail,
}) {
  const name = escapeHtml(agencyName || 'Travel Agency')
  const roleText = escapeHtml(roleLabel(role))
  const greeting = displayName
    ? `Dear ${escapeHtml(displayName)},`
    : 'Hello,'
  const inviterLine = inviterEmail
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b;">Invited by <span style="color:#0f172a;font-weight:600;">${escapeHtml(inviterEmail)}</span></p>`
    : ''
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${name}" width="168" style="display:block;margin:0 auto;max-width:168px;height:auto;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.04em;color:#f8fafc;font-weight:600;">${name}</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're invited to ${name}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(160deg,#1a2332 0%,#2c1810 55%,#7f1d1d 100%);padding:36px 32px 32px;text-align:center;">
              ${logoBlock}
              <p style="margin:18px 0 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(248,250,252,0.72);font-weight:600;">Travel Hub</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#b71c1c;font-weight:700;">Team invitation</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#0f172a;font-weight:600;">
                You've been invited to join ${name}
              </h1>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;color:#334155;">
                ${greeting}
              </p>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;color:#334155;">
                You have been invited to the <strong style="color:#0f172a;">${name}</strong> workspace on Travel Hub.
                Accept this invitation to set your password and start collaborating on the same clients, leads, and bookings as the rest of the team.
              </p>
              ${inviterLine}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;font-weight:600;">Your role</p>
                    <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">${roleText}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:#b71c1c;">
                    <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                      Accept invitation &amp; set password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
                This link expires in 7 days. If the button does not work, copy and paste this URL into your browser:<br />
                <a href="${escapeHtml(inviteUrl)}" style="color:#b71c1c;word-break:break-all;">${escapeHtml(inviteUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#fafbfc;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                ${name} · Travel Hub CRM<br />
                If you were not expecting this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildTeamInviteEmailText({
  agencyName,
  inviteUrl,
  displayName,
  role,
  inviterEmail,
}) {
  const name = agencyName || 'Travel Agency'
  const greeting = displayName ? `Dear ${displayName},` : 'Hello,'
  const inviter = inviterEmail ? `\nInvited by: ${inviterEmail}\n` : ''
  return `${greeting}

You have been invited to join ${name} on Travel Hub.

Role: ${roleLabel(role)}
${inviter}
Accept your invitation and set your password:
${inviteUrl}

This link expires in 7 days.

— ${name}`
}

export function buildTeamInviteSubject(agencyName) {
  return `You're invited to join ${agencyName || 'Honeywell Travel'} on Travel Hub`
}

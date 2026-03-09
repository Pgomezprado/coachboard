interface InvitationEmailProps {
  coachName: string
  athleteName: string | null
  inviteUrl: string
}

export function renderInvitationEmail({ coachName, athleteName, inviteUrl }: InvitationEmailProps): string {
  const greeting = athleteName ? `Hola ${athleteName},` : 'Hola,'

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a CoachBoard</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#10b981;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                💪 CoachBoard
              </h1>
              <p style="margin:4px 0 0;color:#d1fae5;font-size:13px;">Plataforma de entrenamiento deportivo</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                <strong style="color:#e2e8f0;">${coachName}</strong> te ha invitado a unirte a
                <strong style="color:#e2e8f0;">CoachBoard</strong> como atleta. Podrás ver tus planes
                de entrenamiento, registrar sesiones y seguir tu progreso en tiempo real.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background-color:#10b981;border-radius:8px;">
                    <a href="${inviteUrl}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                O copia este enlace en tu navegador:
              </p>
              <p style="margin:0;background-color:#0f172a;border-radius:6px;padding:10px 14px;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#34d399;font-size:12px;text-decoration:none;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #334155;">
              <p style="margin:0;color:#475569;font-size:12px;text-align:center;">
                Esta invitación expira en 7 días. Si no esperabas este email, puedes ignorarlo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

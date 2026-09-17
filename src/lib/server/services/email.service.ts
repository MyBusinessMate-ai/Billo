/**
 * Outside Email Service using Resend API.
 * Executed securely on the backend / server side via TanStack Start Server Function.
 * The RESEND_API_KEY is strictly kept on the server and never exposed to the frontend/browser.
 *
 * Anti-Spam Optimizations:
 * - Dual Multipart MIME (Clean Plaintext + HTML payload)
 * - Explicit reply_to and transactional headers
 * - Standard transactional subject lines
 * - High-reputation sender routing with graceful fallbacks
 */
import { createServerFn } from '@tanstack/react-start'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface SendOtpEmailParams {
  toEmail: string
  otp: string
  purpose: 'email_verification' | 'password_reset'
}

/**
 * Server function that executes strictly on the backend / server runtime.
 */
export const sendOtpEmailServerFn = createServerFn({ method: 'POST' })
  .validator((data: SendOtpEmailParams) => data)
  .handler(async ({ data }: { data: SendOtpEmailParams }) => {
    const { toEmail, otp, purpose } = data

    // Server-side environment variable (Never exposed to client bundle)
    const apiKey =
      (typeof process !== 'undefined' &&
        (process.env?.RESEND_API_KEY || process.env?.MYBUSINESSMATE_RESEND_API_KEY)) ||
      ''

    if (!apiKey) {
      throw new Error(
        'Resend API key missing in environment variables (MYBUSINESSMATE_RESEND_API_KEY or RESEND_API_KEY).'
      )
    }

    const appName =
      (typeof process !== 'undefined' &&
        (process.env?.APP_NAME || process.env?.VITE_APP_NAME || process.env?.VITE_BUSINESS_NAME)) ||
      'Retail POS'

    const isEmailVerification = purpose === 'email_verification'
    const subject = isEmailVerification
      ? `Your ${appName} verification code is ${otp}`
      : `Your ${appName} password reset code is ${otp}`

    const plainText = isEmailVerification
      ? `${appName} - Email Verification\n\nYour 6-digit verification code is: ${otp}\n\nThis code is valid for 15 minutes.\nIf you did not request this email change, please ignore this message.\n\n© ${new Date().getFullYear()} ${appName}`
      : `${appName} - Password Reset\n\nYour 6-digit password reset code is: ${otp}\n\nThis code is valid for 15 minutes.\nIf you did not request a password reset, please ignore this message.\n\n© ${new Date().getFullYear()} ${appName}`

    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Your verification code is ${otp}. Valid for 15 minutes.
  </div>
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;margin:24px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#0b1c30;padding:20px 28px;text-align:left;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">${appName}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 20px 28px;">
        <h2 style="margin:0 0 12px 0;color:#111827;font-size:17px;font-weight:600;">
          ${isEmailVerification ? 'Verify Your Email Address' : 'Reset Your Password'}
        </h2>
        <p style="margin:0 0 16px 0;color:#4b5563;font-size:14px;line-height:1.5;">
          ${
            isEmailVerification
              ? `You requested to update your administrative email address to <strong>${toEmail}</strong>.`
              : `A password reset was requested for your ${appName} admin account.`
          }
          Please enter the following 6-digit verification code:
        </p>
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:20px auto;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:16px 28px;text-align:center;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0b1c30;display:inline-block;">
                ${otp}
              </span>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px;line-height:1.4;">
          This verification code will expire in <strong>15 minutes</strong>. If you did not initiate this request, no action is needed.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:11px;line-height:1.4;">
        This is an automated security message from ${appName}.<br/>
        Please do not reply directly to this email.
      </td>
    </tr>
  </table>
</body>
</html>`

    const senderOptions = [
      `${appName} <noreply@mybusinessmate.ai>`,
      // `${appName} <onboarding@resend.dev>`,
    ]

    let lastError: any = null

    for (const fromAddress of senderOptions) {
      try {
        const response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [toEmail],
            reply_to: 'support@mybusinessmate.ai',

            subject,
            text: plainText,
            html: htmlContent,
            headers: {
              'X-Entity-Ref-ID': `${Date.now()}-${otp}`,
            },
          }),
        })

        const resData = await response.json()
        if (response.ok) {
          console.log(
            `[EmailServerFn] OTP email sent successfully via ${fromAddress} to ${toEmail} (ID: ${resData.id})`
          )
          return { success: true, id: resData.id }
        } else {
          lastError = resData
          console.warn(`[EmailServerFn] Sender ${fromAddress} returned:`, resData)
        }
      } catch (err) {
        lastError = err
        console.error(`[EmailServerFn] Exception sending with ${fromAddress}:`, err)
      }
    }

    console.error('[EmailServerFn] Failed to send email across all sender options:', lastError)
    throw new Error(lastError?.message || 'Failed to dispatch email verification via Resend')
  })

export const emailService = {
  /**
   * Dispatches OTP email via backend server function.
   */
  async sendOtpEmail(params: SendOtpEmailParams): Promise<{ success: boolean; id?: string }> {
    return sendOtpEmailServerFn({ data: params })
  },
}

import {
  fetchAdminAuthDoc,
  saveAdminAuthDoc,
  updateAdminAuthDoc,
  type AdminAuthDoc,
} from '../repositories/auth.repository'
import { setCookie, getCookie, deleteCookie } from '../../../utils/cookies'
import { emailService } from './email.service'
import { hashPasswordWithSalt, generateSalt } from '../../../utils/crypto'

export const AUTH_COOKIE_NAME = 'pos_auth_token'

export interface UserSession {
  email: string
  authenticated: boolean
}

/**
 * Verify a plain password against stored salt and hash.
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPasswordWithSalt(plainPassword, salt)
  return computedHash === storedHash
}

export const authService = {
  /**
   * Ensure admin auth record exists in Firestore, otherwise initialize with default credentials.
   */
  async ensureInitialized(): Promise<AdminAuthDoc> {
    const existing = await fetchAdminAuthDoc()
    if (existing) {
      return existing
    }

    const defaultEmail = 'hello@gmail.com'
    const defaultPassword = '123456'
    const salt = generateSalt()
    const passwordHash = await hashPasswordWithSalt(defaultPassword, salt)

    const initialDoc: AdminAuthDoc = {
      email: defaultEmail,
      passwordHash,
      salt,
      updatedAt: new Date().toISOString(),
    }

    await saveAdminAuthDoc(initialDoc)
    return initialDoc
  },

  /**
   * Authenticate with email & password.
   */
  async login(emailInput: string, passwordInput: string, remember = true): Promise<UserSession> {
    const adminDoc = await this.ensureInitialized()

    const cleanEmail = emailInput.trim().toLowerCase()
    const storedEmail = adminDoc.email.trim().toLowerCase()

    if (cleanEmail !== storedEmail) {
      throw new Error('Invalid email or password')
    }

    const isValid = await verifyPassword(passwordInput, adminDoc.passwordHash, adminDoc.salt)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    // Set auth cookie
    const tokenPayload = btoa(JSON.stringify({ email: adminDoc.email, timestamp: Date.now() }))
    setCookie(AUTH_COOKIE_NAME, tokenPayload, remember ? 30 : 1)

    return {
      email: adminDoc.email,
      authenticated: true,
    }
  },

  /**
   * Get active session from browser cookie.
   */
  getSession(): UserSession | null {
    const token = getCookie(AUTH_COOKIE_NAME)
    if (!token) return null

    try {
      const parsed = JSON.parse(atob(token))
      if (parsed && parsed.email) {
        return {
          email: parsed.email,
          authenticated: true,
        }
      }
    } catch {
      deleteCookie(AUTH_COOKIE_NAME)
    }
    return null
  },

  /**
   * Logout and clear browser cookie.
   */
  logout(): void {
    deleteCookie(AUTH_COOKIE_NAME)
  },

  /**
   * Update admin email and/or password.
   */
  async updateCredentials(
    currentPassword: string,
    newEmail: string,
    newPassword?: string
  ): Promise<void> {
    const adminDoc = await this.ensureInitialized()

    const isCurrentValid = await verifyPassword(
      currentPassword,
      adminDoc.passwordHash,
      adminDoc.salt
    )
    if (!isCurrentValid) {
      throw new Error('Current password verification failed')
    }

    const updates: Partial<AdminAuthDoc> = {
      email: newEmail.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    }

    if (newPassword && newPassword.trim().length > 0) {
      const newSalt = generateSalt()
      const newHash = await hashPasswordWithSalt(newPassword, newSalt)
      updates.salt = newSalt
      updates.passwordHash = newHash
    }

    await updateAdminAuthDoc(updates)

    // Update active cookie with new email
    const tokenPayload = btoa(
      JSON.stringify({ email: updates.email || adminDoc.email, timestamp: Date.now() })
    )
    setCookie(AUTH_COOKIE_NAME, tokenPayload, 30)
  },

  /**
   * Request email change with OTP verification.
   */
  async requestEmailChange(
    currentPassword: string,
    newEmail: string,
    newPassword?: string
  ): Promise<{ otp: string; pendingEmail: string }> {
    const adminDoc = await this.ensureInitialized()

    const isCurrentValid = await verifyPassword(
      currentPassword,
      adminDoc.passwordHash,
      adminDoc.salt
    )
    if (!isCurrentValid) {
      throw new Error('Current password verification failed')
    }

    const cleanNewEmail = newEmail.trim().toLowerCase()
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      throw new Error('Please enter a valid email address')
    }

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const emailChangeExpiresAt = Date.now() + 15 * 60 * 1000

    let pendingPasswordHash: string | undefined
    let pendingSalt: string | undefined
    if (newPassword && newPassword.trim().length > 0) {
      pendingSalt = generateSalt()
      pendingPasswordHash = await hashPasswordWithSalt(newPassword, pendingSalt)
    }

    await updateAdminAuthDoc({
      pendingEmail: cleanNewEmail,
      emailChangeOtp: otp,
      emailChangeExpiresAt,
      pendingPasswordHash: pendingPasswordHash || undefined,
      pendingPasswordSalt: pendingSalt || undefined,
    })

    const isEmailChanging = cleanNewEmail !== adminDoc.email.trim().toLowerCase()

    // Send OTP verification email via outside Resend email service
    await emailService.sendOtpEmail({
      toEmail: cleanNewEmail,
      otp,
      purpose: isEmailChanging ? 'email_verification' : 'password_reset',
    })

    return {
      otp,
      pendingEmail: cleanNewEmail,
    }
  },

  /**
   * Confirm credentials/email change using the 6-digit OTP.
   */
  async confirmEmailChange(otp: string): Promise<string> {
    const adminDoc = await this.ensureInitialized()

    const now = Date.now()
    if (!adminDoc.emailChangeExpiresAt || now > adminDoc.emailChangeExpiresAt) {
      throw new Error('Security verification OTP has expired. Please request a new one.')
    }

    if (!adminDoc.emailChangeOtp || adminDoc.emailChangeOtp !== otp.trim()) {
      throw new Error('Invalid verification OTP.')
    }

    const newEmail = adminDoc.pendingEmail || adminDoc.email
    const updates: Partial<AdminAuthDoc> = {
      email: newEmail,
      updatedAt: new Date().toISOString(),
      pendingEmail: undefined,
      emailChangeOtp: undefined,
      emailChangeExpiresAt: undefined,
    }

    if (adminDoc.pendingPasswordHash && adminDoc.pendingPasswordSalt) {
      updates.passwordHash = adminDoc.pendingPasswordHash
      updates.salt = adminDoc.pendingPasswordSalt
      updates.pendingPasswordHash = undefined
      updates.pendingPasswordSalt = undefined
    }

    await updateAdminAuthDoc(updates)

    // Update active session cookie
    const tokenPayload = btoa(JSON.stringify({ email: newEmail, timestamp: Date.now() }))
    setCookie(AUTH_COOKIE_NAME, tokenPayload, 30)

    return newEmail
  },

  /**
   * Generate a 6-digit OTP for password recovery.
   */
  async generatePasswordReset(emailInput: string): Promise<{ otp: string; resetToken: string }> {
    const adminDoc = await this.ensureInitialized()
    const cleanEmail = emailInput.trim().toLowerCase()

    if (cleanEmail !== adminDoc.email.trim().toLowerCase()) {
      throw new Error('No admin account registered with this email address')
    }

    // 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    // Secure token fallback
    const resetToken = generateSalt()
    const resetExpiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes expiry

    await updateAdminAuthDoc({
      resetOtp: otp,
      resetToken,
      resetExpiresAt,
    })

    // Send OTP email via outside Resend email service
    await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otp,
      purpose: 'password_reset',
    })

    return {
      otp,
      resetToken,
    }
  },

  /**
   * Reset password using either OTP or reset token.
   */
  async resetPassword(otpOrToken: string, newPassword: string): Promise<void> {
    const adminDoc = await this.ensureInitialized()

    const now = Date.now()
    if (!adminDoc.resetExpiresAt || now > adminDoc.resetExpiresAt) {
      throw new Error('Reset request has expired. Please request a new OTP or reset link.')
    }

    const isMatchOtp = adminDoc.resetOtp && adminDoc.resetOtp === otpOrToken.trim()
    const isMatchToken = adminDoc.resetToken && adminDoc.resetToken === otpOrToken.trim()

    if (!isMatchOtp && !isMatchToken) {
      throw new Error('Invalid OTP or reset link token.')
    }

    const newSalt = generateSalt()
    const newHash = await hashPasswordWithSalt(newPassword, newSalt)

    await updateAdminAuthDoc({
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: new Date().toISOString(),
      resetOtp: undefined,
      resetToken: undefined,
      resetExpiresAt: undefined,
    })
  },
}

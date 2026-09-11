import React, { useState, useEffect } from 'react'
import { authService } from '../../lib/server/services/auth.service'
import { usePOS } from '../../context/POSContext'

export const AuthSettingsForm: React.FC = () => {
  const { showToast } = usePOS()

  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Email Change OTP Verification Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [enteredOtp, setEnteredOtp] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')

  useEffect(() => {
    // Load initial email from session or Firestore
    const session = authService.getSession()
    if (session?.email) {
      setCurrentEmail(session.email)
      setNewEmail(session.email)
    } else {
      authService.ensureInitialized().then((doc) => {
        setCurrentEmail(doc.email)
        setNewEmail(doc.email)
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!currentPassword) {
      setErrorMsg('Please enter your current password to authorize changes.')
      return
    }

    const cleanNewEmail = newEmail.trim().toLowerCase()
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrative email address.')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.')
      return
    }

    const isEmailChanging = cleanNewEmail !== currentEmail.trim().toLowerCase()
    const isPasswordChanging = Boolean(newPassword && newPassword.length > 0)

    if (!isEmailChanging && !isPasswordChanging) {
      setSuccessMsg('No changes detected.')
      return
    }

    setIsLoading(true)
    try {
      // Require OTP verification for both email change and password change
      await authService.requestEmailChange(currentPassword, cleanNewEmail, newPassword || undefined)
      setEnteredOtp('')
      setOtpError('')
      setIsOtpModalOpen(true)
      showToast(`Verification code sent to ${cleanNewEmail}`, 'info')
    } catch (err: any) {
      console.error('[AuthSettingsForm] Update error:', err)
      setErrorMsg(err.message || 'Failed to update credentials. Please check current password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmEmailChangeOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError('')

    if (!enteredOtp || enteredOtp.trim().length < 6) {
      setOtpError('Please enter the valid 6-digit OTP code.')
      return
    }

    const isEmailChanging = newEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()
    const isPasswordChanging = Boolean(newPassword && newPassword.length > 0)

    setIsVerifyingOtp(true)
    try {
      const updatedEmail = await authService.confirmEmailChange(enteredOtp.trim())
      setCurrentEmail(updatedEmail)
      setNewEmail(updatedEmail)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setEnteredOtp('')
      setIsOtpModalOpen(false)

      const successText =
        isEmailChanging && isPasswordChanging
          ? `Admin email and password updated successfully!`
          : isEmailChanging
            ? `Admin email successfully changed to ${updatedEmail}`
            : 'Admin password updated successfully!'

      setSuccessMsg(successText)
      showToast(successText, 'success')
    } catch (err: any) {
      console.error('[AuthSettingsForm] OTP Verify error:', err)
      setOtpError(err.message || 'Invalid or expired OTP code.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      await authService.requestEmailChange(
        currentPassword,
        newEmail.trim().toLowerCase(),
        newPassword || undefined
      )
      setEnteredOtp('')
      setOtpError('')
      showToast(`New verification code sent to ${newEmail.trim()}`, 'info')
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend OTP')
    }
  }

  const isEmailChanging = newEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase()
  const isPasswordChanging = Boolean(newPassword && newPassword.length > 0)

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-lg shadow-sm border border-outline-variant/40 space-y-pad-md">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-pad-sm border-b border-outline-variant/30 gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">
            shield_person
          </span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Admin Authentication & Security Credentials
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Manage the primary email and master password used to authenticate register access.
            </p>
          </div>
        </div>

        <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
          STEP 04
        </span>
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div className="p-pad-sm bg-error/10 border border-error/30 rounded-DEFAULT text-error font-body-sm text-body-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-pad-sm bg-secondary/10 border border-secondary/30 rounded-DEFAULT text-on-surface font-body-sm text-body-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Active Account Info */}
        <div className="p-pad-xs bg-surface-container-low rounded-DEFAULT flex items-center justify-between px-3 py-2.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Current Active Admin Email:
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm font-semibold text-on-surface">
            {currentEmail || 'admin@example.com'}
          </span>
        </div>

        {/* Current Password Verification */}
        <div>
          <label
            htmlFor="auth-current-password"
            className="block font-label-sm text-label-sm text-on-surface-variant mb-1"
          >
            Current Password * (Required for changes)
          </label>
          <div className="relative flex items-center">
            <input
              id="auth-current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password..."
              required
              className="w-full p-2.5 pl-3 pr-10 bg-surface-container-low text-on-surface rounded-DEFAULT font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-outline-variant/30 transition-all shadow-2xs placeholder:text-on-surface-variant/40"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              aria-label="Toggle current password visibility"
              className="absolute right-2.5 p-1.5 text-on-surface-variant hover:text-on-surface focus:outline-none transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showCurrentPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* New Admin Email */}
          <div className="md:col-span-2">
            <label
              htmlFor="auth-new-email"
              className="block font-label-sm text-label-sm text-on-surface-variant mb-1"
            >
              Admin Email Address (Requires OTP verification when changed)
            </label>
            <input
              id="auth-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. admin@example.com"
              required
              className="w-full p-2.5 px-3 bg-surface-container-low text-on-surface rounded-DEFAULT font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-outline-variant/30 transition-all shadow-2xs placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="auth-new-password"
              className="block font-label-sm text-label-sm text-on-surface-variant mb-1"
            >
              New Password (Requires OTP verification)
            </label>
            <div className="relative flex items-center">
              <input
                id="auth-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                className="w-full p-2.5 pl-3 pr-10 bg-surface-container-low text-on-surface rounded-DEFAULT font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-outline-variant/30 transition-all shadow-2xs placeholder:text-on-surface-variant/40"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label="Toggle new password visibility"
                className="absolute right-2.5 p-1.5 text-on-surface-variant hover:text-on-surface focus:outline-none transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showNewPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="block font-label-sm text-label-sm text-on-surface-variant mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="auth-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={!newPassword}
                className="w-full p-2.5 pl-3 pr-10 bg-surface-container-low text-on-surface rounded-DEFAULT font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-outline-variant/30 transition-all shadow-2xs disabled:opacity-40 placeholder:text-on-surface-variant/40"
              />
              <button
                type="button"
                disabled={!newPassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-2.5 p-1.5 text-on-surface-variant hover:text-on-surface focus:outline-none transition-colors cursor-pointer disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            id="auth-update-btn"
            type="submit"
            disabled={isLoading}
            className="p-2 h-button-md px-5 rounded-DEFAULT bg-primary text-on-primary hover:bg-on-primary-fixed-variant font-label-md text-label-md font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span>
              {isLoading
                ? 'Processing...'
                : isEmailChanging && isPasswordChanging
                  ? 'Send OTP & Save Changes'
                  : isEmailChanging
                    ? 'Send OTP & Verify Email'
                    : isPasswordChanging
                      ? 'Send OTP & Update Password'
                      : 'Update Credentials'}
            </span>
          </button>
        </div>
      </form>

      {/* Security Verification Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  mark_email_read
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {isPasswordChanging ? 'Verify Password Update' : 'Verify Email Change'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmEmailChangeOtp} className="mt-4 space-y-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                A 6-digit security code has been sent to{' '}
                <strong className="text-on-surface">{newEmail.trim()}</strong>. Please check your
                inbox and enter the code below to authorize your{' '}
                {isPasswordChanging ? 'password' : 'email'} update.
              </p>

              {otpError && (
                <div className="p-pad-xs bg-error/10 border border-error/30 rounded-DEFAULT text-error font-body-sm text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email-change-otp-input"
                  className="block font-label-sm text-label-sm font-medium text-on-surface mb-1.5"
                >
                  Enter 6-Digit OTP Code *
                </label>
                <input
                  id="email-change-otp-input"
                  type="text"
                  required
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="XXXXXX"
                  className="w-full p-2.5 px-3 font-mono-numeric-md text-mono-numeric-md bg-surface-container-low border border-outline-variant/50 rounded-DEFAULT focus:outline-none focus:ring-1 focus:ring-primary text-center tracking-widest placeholder:text-on-surface-variant/40 shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer p-2"
                >
                  Resend OTP
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOtpModalOpen(false)}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-surface-container text-on-surface hover:bg-surface-container-high cursor-pointer font-label-md text-label-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-primary text-on-primary hover:bg-on-primary-fixed-variant cursor-pointer font-label-md text-label-md font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>
                      {isVerifyingOtp
                        ? 'Verifying...'
                        : isPasswordChanging
                          ? 'Save Password'
                          : 'Confirm Email'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

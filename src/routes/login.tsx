import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { User, KeyRound, Eye, EyeOff, ArrowRight, Key, CheckCircle } from 'lucide-react'
import { usePOS } from '../context/POSContext'
import { ToastContainer } from '../components/common/ToastContainer'
import { authService } from '../lib/server/services/auth.service'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { settings, showToast } = usePOS()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Forgot Password / Reset state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [enteredOtpOrToken, setEnteredOtpOrToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showResetNewPassword, setShowResetNewPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const session = authService.getSession()
    if (session) {
      navigate({ to: '/' })
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authService.login(email, pin, rememberSession)
      showToast('Authenticated successfully', 'success')
      navigate({ to: '/' })
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResetting(true)
    try {
      await authService.generatePasswordReset(resetEmail)
      setEnteredOtpOrToken('')
      setResetStep('verify')
      showToast(`Password reset OTP sent to ${resetEmail}`, 'info')
    } catch (err: any) {
      showToast(err.message || 'Failed to request password reset', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error')
      return
    }
    if (newPassword.length < 4) {
      showToast('Password must be at least 4 characters long', 'error')
      return
    }

    setIsResetting(true)
    try {
      await authService.resetPassword(enteredOtpOrToken, newPassword)
      showToast('Password reset successfully! Please sign in.', 'success')
      setIsResetModalOpen(false)
      setResetStep('request')
      setPin(newPassword)
      setEmail(resetEmail)
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 bg-[#f8f9ff] text-[#0b1c30] select-none font-sans">
      {/* Top System Telemetry Bar */}
      {/* <div className="w-full max-w-sm flex items-center justify-between text-[#45464d] text-[12px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#006a63] inline-block animate-pulse" />
          <span className="font-semibold tracking-wider text-[11px] text-[#0b1c30]">
            SYSTEM ONLINE
          </span>
        </div>
        <span className="text-[#45464d] font-mono text-[12px] font-medium">{systemTime}</span>
      </div> */}

      {/* Central Authentication Unit */}
      <div className="w-full max-w-sm flex flex-col my-auto">
        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo Mark */}
          {settings.logoUrl && (
            <div className="w-10 h-10 rounded-lg bg-[#d3e4fe] flex items-center justify-center mb-3 shadow-xs">
              <img
                src={settings.logoUrl}
                alt={settings.businessName || 'Brand Mark'}
                className="w-6 h-6 object-contain"
              />
            </div>
          )}

          {/* Business / Product Name */}
          <h1 className="text-[20px] font-semibold text-[#0b1c30] tracking-tight">
            {settings.businessName || 'LedgerPOS'}
          </h1>
          <p className="text-[13px] text-[#45464d] mt-0.5">Billing System</p>
        </div>

        {/* Main Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          {/* Username / Email Input Block */}
          <div className="flex flex-col space-y-1">
            <label htmlFor="user-id" className="text-[12px] text-[#0b1c30] font-medium">
              Username / Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[18px] text-[#76777d] pointer-events-none flex items-center">
                <User className="w-4 h-4 text-[#76777d]" />
              </span>
              <input
                id="user-id"
                name="user-id"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@gmail.com"
                className="w-full h-[38px] bg-white text-[#0b1c30] text-[14px] pl-9 pr-3 rounded-lg border border-[#c6c6cd]/50 shadow-2xs focus:outline-none focus:bg-[#eff4ff] focus:border-[#76777d] transition-colors duration-150"
              />
            </div>
          </div>

          {/* Password Input Block */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="user-pin" className="text-[12px] text-[#0b1c30] font-medium">
                Password / Access PIN
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email)
                  setIsResetModalOpen(true)
                  setResetStep('request')
                }}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#76777d] pointer-events-none flex items-center">
                <KeyRound className="w-4 h-4 text-[#76777d]" />
              </span>
              <input
                id="user-pin"
                name="user-pin"
                type={showPin ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
                className="w-full h-[38px] bg-white text-[#0b1c30] font-mono text-[14px] pl-9 pr-10 rounded-lg border border-[#c6c6cd]/50 shadow-2xs focus:outline-none focus:bg-[#eff4ff] focus:border-[#76777d] tracking-wider transition-colors duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                aria-label="Toggle password visibility"
                className="absolute right-2.5 p-1 text-[#76777d] hover:text-[#0b1c30] focus:outline-none transition-colors cursor-pointer"
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4 text-[#76777d]" />
                ) : (
                  <Eye className="w-4 h-4 text-[#76777d]" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Session */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                id="remember-session"
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded bg-white text-[#000000] border-[#c6c6cd] focus:ring-0 focus:outline-none accent-black cursor-pointer"
              />
              <span className="text-[13px] text-[#45464d]">Remember me</span>
            </label>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[42px] bg-[#000000] text-white text-[15px] font-semibold rounded-lg flex items-center justify-center space-x-2 shadow-sm hover:bg-[#1f2937] active:scale-[0.99] transition duration-150 ease-in-out cursor-pointer mt-2 disabled:opacity-60"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Forgot Password / Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-secondary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Reset Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1.5"
              >
                ✕
              </button>
            </div>

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="mt-4 space-y-4">
                <p className="text-body-sm text-on-surface-variant">
                  Enter your registered admin email to receive a secure 6-digit OTP code.
                </p>
                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                    Registered Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. admin@example.com"
                    className="w-full p-2.5 px-3 bg-surface-container-low border border-outline-variant/50 rounded-DEFAULT text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-on-surface-variant/40"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-surface-container text-on-surface hover:bg-surface-container-high cursor-pointer font-label-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-primary text-on-primary hover:bg-on-primary-fixed-variant cursor-pointer font-label-md font-semibold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isResetting ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="mt-4 space-y-3.5">
                <p className="text-body-sm text-on-surface-variant">
                  A 6-digit password reset code has been sent to{' '}
                  <strong className="text-on-surface">{resetEmail}</strong>. Please check your inbox
                  and enter the code below.
                </p>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtpOrToken}
                    onChange={(e) =>
                      setEnteredOtpOrToken(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="XXXXXX"
                    className="w-full p-2.5 px-3 font-mono bg-surface-container-low border border-outline-variant/50 rounded-DEFAULT text-body-sm focus:outline-none focus:ring-1 focus:ring-primary text-center tracking-widest placeholder:text-on-surface-variant/40 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full p-2.5 pl-3 pr-10 bg-surface-container-low border border-outline-variant/50 rounded-DEFAULT text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-on-surface-variant/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      aria-label="Toggle new password visibility"
                      className="absolute right-2.5 p-1.5 text-[#76777d] hover:text-[#0b1c30] focus:outline-none transition-colors cursor-pointer"
                    >
                      {showResetNewPassword ? (
                        <EyeOff className="w-4 h-4 text-[#76777d]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#76777d]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full p-2.5 pl-3 pr-10 bg-surface-container-low border border-outline-variant/50 rounded-DEFAULT text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-on-surface-variant/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      aria-label="Toggle confirm password visibility"
                      className="absolute right-2.5 p-1.5 text-[#76777d] hover:text-[#0b1c30] focus:outline-none transition-colors cursor-pointer"
                    >
                      {showResetConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-[#76777d]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#76777d]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-surface-container text-on-surface hover:bg-surface-container-high cursor-pointer font-label-md transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="p-2 h-button-md px-4 rounded-DEFAULT bg-primary text-on-primary hover:bg-on-primary-fixed-variant cursor-pointer font-label-md font-semibold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isResetting ? 'Resetting...' : 'Save New Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Security Footer */}
      {/* <div className="w-full max-w-md text-center py-2">
        <div className="inline-flex items-center space-x-1.5 text-[#45464d] font-mono text-[12px]">
          <Lock className="w-3.5 h-3.5 text-[#45464d]" />
          <span>
            {settings.businessName || 'LedgerPOS'} • Offline-ready secure encryption
          </span>
        </div>
      </div> */}

      {/* Global reactive toast notifications */}
      <ToastContainer />
    </div>
  )
}

import React from 'react'

interface SocialLinksFormProps {
  values: {
    instagram: string
    website: string
    whatsapp: string
    googleReview: string
  }
  onChange: (field: string, val: string) => void
}

export const SocialLinksForm: React.FC<SocialLinksFormProps> = ({ values, onChange }) => {
  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/40 p-pad-lg shadow-sm">
      <div className="flex items-center justify-between pb-pad-sm mb-pad-md border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">
            alternate_email
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Receipt Social Links & Online Handles
          </h2>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
          STEP 02
        </span>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-pad-md">
        Printed selectively below transaction breakdowns for omni-channel conversion.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-pad-md">
        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-semibold mb-1"
            htmlFor="instagram-input"
          >
            Instagram Link
          </label>
          <div className="flex items-center h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="p-2 px-2.5 bg-surface-container-low text-on-surface-variant font-mono-numeric-sm text-[12px] border-r border-outline-variant/40 select-none">
              https://
            </span>
            <input
              className="p-2 w-full h-full px-pad-xs font-body-sm text-body-sm text-on-surface focus:outline-none bg-transparent"
              id="instagram-input"
              type="text"
              value={values.instagram}
              onChange={(e) => onChange('instagram', e.target.value)}
              placeholder="instagram.com/yourbusiness"
            />
          </div>
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-semibold mb-1"
            htmlFor="website-input"
          >
            Website Link
          </label>
          <div className="flex items-center h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="p-2 px-2.5 bg-surface-container-low text-on-surface-variant font-mono-numeric-sm text-[12px] border-r border-outline-variant/40 select-none">
              https://
            </span>
            <input
              className="p-2 w-full h-full px-pad-xs font-body-sm text-body-sm text-on-surface focus:outline-none bg-transparent"
              id="website-input"
              type="text"
              value={values.website}
              onChange={(e) => onChange('website', e.target.value)}
              placeholder="yourdomain.com"
            />
          </div>
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="whatsapp-input"
          >
            WhatsApp Business Support
          </label>
          <div className="flex items-center h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="p-2 px-2.5 bg-surface-container-low text-on-surface-variant font-mono-numeric-sm text-[12px] border-r border-outline-variant/40 select-none">
              wa.me
            </span>
            <input
              className="p-2 w-full h-full px-pad-xs font-body-sm text-body-sm text-on-surface focus:outline-none bg-transparent"
              id="whatsapp-input"
              type="text"
              value={values.whatsapp}
              onChange={(e) => onChange('whatsapp', e.target.value)}
              placeholder="+91 98765 00000"
            />
          </div>
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="review-input"
          >
            Google Review Link
          </label>
          <div className="flex items-center h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="p-2 px-2.5 bg-surface-container-low text-on-surface-variant font-mono-numeric-sm text-[12px] border-r border-outline-variant/40 select-none">
              review
            </span>
            <input
              className="p-2 w-full h-full px-pad-xs font-body-sm text-body-sm text-on-surface focus:outline-none bg-transparent"
              id="review-input"
              type="text"
              value={values.googleReview}
              onChange={(e) => onChange('googleReview', e.target.value)}
              placeholder="g.page/r/ledgerpos-central"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

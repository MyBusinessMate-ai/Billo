/**
 * Isolated printing utility for thermal slips & commercial invoices.
 * Prints cleanly inside a sandboxed hidden iframe with zero app UI bleed-through.
 */

export interface PrintOptions {
  format?: 'thermal' | 'horizontal' | 'vertical' | 'a4'
  title?: string
}

export function printElementContent(elementId: string, options: PrintOptions = {}): boolean {
  if (typeof document === 'undefined') return false

  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`[PrintUtility] Element with id "${elementId}" not found.`)
    return false
  }

  const format = options.format || 'thermal'
  const title = options.title || (format === 'thermal' ? 'Receipt' : 'Tax Invoice')

  // Remove existing print iframe if any
  const existingIframe = document.getElementById('print-service-iframe')
  if (existingIframe) {
    existingIframe.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'print-service-iframe'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'

  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) {
    console.error('[PrintUtility] Could not access print iframe document.')
    return false
  }

  // Clone printable DOM
  const contentClone = element.cloneNode(true) as HTMLElement

  // Generate format-specific print stylesheet
  const thermalStyles = `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    html, body {
      width: 76mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  `

  const verticalStyles = `
    @page {
      size: 8.5in 11in;
      margin: 0.4in 0.4in;
    }
    html, body {
      width: 100%;
      height: 100%;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    #print-root {
      width: 100%;
      min-height: 10in;
      display: block;
    }
    #printable-horizontal-invoice {
      border: 2px solid #000000 !important;
      box-shadow: none !important;
      max-width: 7.7in !important;
      width: 100% !important;
      min-height: 10in !important;
      height: auto !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      margin: 0 auto !important;
    }
    .print-keep-together {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `

  const styles = format === 'thermal' ? thermalStyles : verticalStyles

  // Grab active stylesheets for Tailwind / Geist font classes
  const stylesTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n')

  iframeDoc.open()
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${stylesTags}
        <style>
          ${styles}
        </style>
      </head>
      <body>
        <div id="print-root">
          ${contentClone.outerHTML}
        </div>
      </body>
    </html>
  `)
  iframeDoc.close()

  // Wait for images and fonts to load before triggering print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (err) {
      console.error('[PrintUtility] Print trigger error:', err)
    } finally {
      // Clean up iframe after print dialog completes/dismisses
      setTimeout(() => {
        iframe.remove()
      }, 2000)
    }
  }, 250)

  return true
}

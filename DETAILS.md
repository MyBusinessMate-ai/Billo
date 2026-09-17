# Billo — Enterprise POS & Commercial Billing System
## Comprehensive System Feature Specification & QA Verification Manual

---

## 1. Executive System Overview

**Billo** is a high-performance, enterprise-grade Point of Sale (POS) and commercial billing application engineered specifically for modern retail stores, supermarkets, electronics retailers, garment boutiques, and multi-category merchants operating within the Indian GST framework (with first-class compliance for Telangana and inter-state commerce).

### 1.1 Core Architecture & Technology Stack
- **Framework & Router**: React 19, Vite, TanStack Start / Router (SPA & SSR-ready architecture).
- **Styling & Design System**: Tailwind CSS (M3 design system tokens, high-contrast dark/light modes).
- **Database & Realtime Backend**: Google Cloud Firebase Firestore (atomic transactions, server-side repositories, zero persistent client-side data leakage).
- **Cloud Media CDN**: Cloudinary CDN (direct unsigned uploads, authenticated asset deletion, real-time storage quota tracking).
- **Transactional Communication**: Resend API (secure OTP dispatch for administrative credentials and verification).
- **Audio & Hardware Interfacing**: Native Web Audio API (real-time synthesizer feedback) and Global USB HID Barcode Wedge listener.
- **Printing Engine**: Isolated multi-frame print manager supporting ESC/POS 80mm thermal receipt rolls and multi-page A4/Letter commercial tax invoices.

---

## 2. Complete Functional Feature Catalog

```
Billo System Feature Matrix
├── 1. POS Billing & Checkout Engine
│   ├── Interactive Product Catalog & Search
│   ├── Global USB Barcode Scanner Wedge (HID Buffer + Audio Chime)
│   ├── Real-Time Stock Enforcement & Anti-Depletion Guardrails
│   ├── Indian GST Section 15(3) Compliant Tax Engine
│   ├── Mathematical Round-Off Adjustment Row
│   ├── Telangana State (36) Intra-State vs Inter-State (IGST) Switching
│   ├── Quick Customer CRM Selector & In-Cart Creation
│   ├── POS Keyboard Shortcuts ([F4], [F8], [Ctrl+Enter], [Esc])
│   └── Multi-Format Print Engine (80mm Thermal & A4/Letter Commercial)
├── 2. Category & Dynamic Custom Fields Engine
│   ├── Category-Specific Custom Field Schemas
│   ├── Separate Column vs Merged Column Modes
│   ├── Text Casing Transformations (Uppercase, Lowercase, Capitalize)
│   └── Drag-and-Drop / Button Reordering
├── 3. Inventory & Catalog Management
│   ├── SKU, Barcode, EAN-13, and Category Organization
│   ├── Real-time Stock Tracking & Low-Stock Alerts
│   ├── Dynamic Custom Field Value Inputs
│   ├── CSV Bulk Import with Custom Field Mapping
│   └── Stock Replenishment upon Invoice Deletion / Void
├── 4. Customer Relationship Management (CRM)
│   ├── Profile Management (Name, Mobile, Email, GSTIN)
│   ├── Lifetime Spend & Total Visit Tracking
│   ├── Transaction History Association
│   └── Automatic Spend/Visit Rollback upon Bill Deletion
├── 5. Invoice Ledger & History Management
│   ├── Comprehensive Invoice Search & Filtering
│   ├── Detailed Invoice Inspection Drawer
│   ├── Instant Re-printing (Thermal 80mm & A4)
│   ├── Invoice Refund & Deletion Lifecycle
│   └── Excel / CSV Invoice Ledger Export
├── 6. Store Branding & Bill Template Customizer
│   ├── Full Visual Template Customizer with Live Preview
│   ├── Customizable Standard Column Labels
│   ├── Dual QR Code System (UPI Payment QR & Dynamic Social QR)
│   └── Authorized Signatory & Terms & Conditions Customization
└── 7. Media Library & System Settings
    ├── Cloudinary Media Asset Manager
    ├── Visual Theme Tokens (Light / Dark Palettes)
    └── Admin Security & OTP Verification via Resend
```

---

## 3. Detailed Feature Breakdown

### Module 1: POS Billing & Real-Time Checkout Engine

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **Product Search & Quick Grid** | Visual catalog on the left pane of POS billing screen. | • Instant client-side filtering by product name, SKU, or barcode.<br>• Category tabs for one-click filtering.<br>• Stock count badges with color coding (Green: In Stock, Amber: Low Stock, Red: Out of Stock).<br>• Disabled click behavior for 0-stock items. |
| **USB Barcode Scanner Wedge** | Intercepts physical USB barcode scanner keystrokes globally. | • Captures rapid keyboard bursts (<160ms inter-key latency) terminating with `Enter`.<br>• Does not require focusing an input field.<br>• Matches SKU, EAN-13, Barcode, or ID.<br>• Increments quantity if item already exists in cart.<br>• Plays a dual-tone Web Audio chime (`880Hz` $\rightarrow$ `1760Hz`) upon successful scan. |
| **Inventory Guardrails** | Prevents overselling and negative inventory in the ledger. | • Steppers and inline quantity inputs are strictly capped at `product.stock`.<br>• Prevents cashiers from billing more units than physically available.<br>• Real-time toast warnings if available inventory limit is reached. |
| **Section 15(3) Tax Calculation** | Commercial tax calculation compliant with Indian CGST Section 15(3). | • Discounts are deducted from the gross amount **before** calculating tax.<br>• Proportional discount ratio allocated across line items.<br>• Tax is never charged on discounted amounts.<br>• Formatted as: `Taxable Value = Gross Subtotal - Discounts`. |
| **Mathematical Round-Off** | Explicit row ensuring exact payable whole rupee amounts. | • Calculates `Round Off = Math.round(Exact Net) - Exact Net`.<br>• Displays `+₹X.XX` or `-₹X.XX` row in ledger, thermal receipt, and A4 invoice.<br>• Eliminates floating-point discrepancies and cashier cash mismatch. |
| **Telangana GST Compliance** | State-code aware GST distribution. | • Automatically identifies store state code (Telangana `36`).<br>• If customer GSTIN begins with another state (e.g. `37`, `29`, `27`), automatically switches tax to **IGST**.<br>• If customer is unregistered or within Telangana (`36`), splits tax equally into **CGST** and **SGST**.<br>• Displays Place of Supply explicitly. |
| **POS Keyboard Shortcuts** | Hardware-accelerated workflow for high-volume billing. | • `[F4]`: Quick-switch payment mode to Cash.<br>• `[F8]`: Quick-switch payment mode to UPI.<br>• `[Ctrl + Enter]`: Settle and confirm billing.<br>• `[Esc]`: Clear cart and reset transaction. |
| **Internal Staff Notes** | Private transaction notes for cashier/manager communication. | • Allows entering notes regarding customer requests, payment reference numbers, or exceptions.<br>• Visually highlighted on screen in amber banner.<br>• **Never printed** on customer receipts or invoices. |

---

### Module 2: Category & Dynamic Custom Fields Engine

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **Category Custom Schemas** | Define bespoke attributes per category without modifying code. | • Supported field types: `text`, `number`, `date`, `select`.<br>• Required/optional field toggling.<br>• Default seed schemas (Garments: Size, Color; Electronics: Warranty, Serial No; Groceries: Expiry Date, Batch No). |
| **Column Display Modes** | Choose how custom fields appear on commercial invoices. | • **Separate Column Mode**: Creates a dedicated table column with a custom header label.<br>• **Merged Column Mode**: Appends the field neatly under standard columns (`Description`, `HSN`, `Qty`, `Rate`, `Total`). |
| **Text Casing Control** | Normalizes printed text output regardless of how cashiers enter it. | • Supported casing: `uppercase`, `lowercase`, `capitalize`, `normal`.<br>• Ensures consistency on official tax documents. |
| **Visual Field Reordering** | Order of merged fields. | • Move Up / Move Down buttons to sequence fields appearing under descriptions. |

---

### Module 3: Inventory & Catalog Management

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **Product CRUD** | Complete lifecycle management for store catalog. | • Attributes: Name, Category, SKU, Barcode/EAN, Price, Cost Price, Tax Rate (%), Stock, Min Stock Level.<br>• Dynamic inputs automatically rendered for custom fields defined by the chosen category.<br>• Input validation preventing invalid prices or negative stock. |
| **CSV Bulk Import** | Fast onboarding of existing store inventories. | • Parses standard CSV files.<br>• Dropdown mapping for standard fields (Name, Price, SKU, Stock, Tax).<br>• Dynamic dropdown mapping for category custom fields.<br>• Bulk upload directly into Firestore with progress tracking. |
| **Stock Replenishment on Void** | Automatic reverse-logistics inventory integrity. | • When an invoice is deleted or voided from the history screen, all line items are automatically returned to inventory via `productRepository.restockProductDoc`.<br>• Prevents inventory drift and manual stock adjustments. |

---

### Module 4: Customer Relationship Management (CRM)

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **Customer Registry** | Comprehensive database of walk-in and registered clients. | • Tracks Name, Mobile Number, Email Address, and GSTIN.<br>• Search customers by name, phone, or GSTIN.<br>• Quick-add customer modal directly from the POS checkout ledger. |
| **Metrics Tracking & Rollback** | Real-time analytics per customer. | • Tracks `totalSpend` and `totalVisits`.<br>• Automatically updated when a transaction is completed.<br>• Automatically decremented when an invoice is deleted from the history screen via `customerRepository.decrementCustomerStatsDoc`. |

---

### Module 5: Commercial Invoices & Print Engine

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **A4 / Letter Commercial Invoice** | Formal GST-compliant tax invoice. | • Clean tabular layout with corporate branding, GSTIN, and contact information.<br>• Place of Supply indicator.<br>• Dynamic CGST+SGST vs IGST columns.<br>• HSN/SAC Tax Summary Table with taxable value and tax breakdowns.<br>• Amount in Words (Indian numbering system: Lakhs / Crores).<br>• Dynamic QR code (UPI Payment QR or Social/Google Review QR).<br>• Terms & Conditions block and Authorized Signatory box.<br>• Automatic pagination with `page-break-inside: avoid` (no mid-row splits). |
| **80mm ESC/POS Thermal Receipt** | Compact roll format for receipt printers. | • Designed for 80mm thermal receipt printers.<br>• High-contrast typography with monospace item alignments.<br>• Displays store info, customer details, itemized totals, Section 15(3) tax breakdown, round off, and payment mode.<br>• Dynamic UPI QR code for fast cashier counter payments. |
| **Isolated Print Engine** | Native browser print without UI pollution. | • Clones only the printable container into an isolated hidden iframe.<br>• Injects self-contained print CSS styles.<br>• Eliminates header/footer URL artifacts and sidebar pollution. |

---

### Module 6: Template Customizer & Store Settings

| Feature Name | Description | Key Capabilities |
|---|---|---|
| **Live Bill Template Customizer** | Real-time visual control over receipt components. | • Toggles for: Logo, Subtitle, Store Address, Store Phone, Store Email, Store GSTIN, Customer Phone, Customer Email, Category, HSN/SAC, Item Discounts, Tax Breakdown, Amount in Words, Ship To, Remarks, QR Code, Terms & Conditions, Authorized Signatory, Footer Notice.<br>• Live side-by-side preview reflecting changes instantly.<br>• Persistence to Firestore `settings/store_config`. |
| **Dual QR Code Architecture** | Flexible QR code generation for payments or marketing. | • **UPI Payment QR**: Generated automatically using NPCI UPI specification (`upi://pay?pa=...&am=...&tn=...`) when UPI is chosen.<br>• **Dynamic Social/Marketing QR**: Configurable destination (Google Review link, Instagram handle, Store Website, or Custom URL). |
| **Custom Column Headers** | Merchant-specific terminology customization. | • Rename standard table headers: `itemLabel` (e.g. "Description"), `qtyLabel` (e.g. "Pcs / Nos"), `rateLabel` (e.g. "Unit Price"), `totalLabel` (e.g. "Amount"). |

---

## 4. Comprehensive QA Test Verification Matrix

This matrix is designed for QA engineers, testers, and auditors to systematically verify all system behaviors, edge cases, and compliance rules.

### Test Suite 1: Indian GST Section 15(3) & Financial Precision

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-FIN-01** | Standard Section 15(3) Discount Before Tax | 1. Add item: ₹1,000 gross, 5% GST.<br>2. Apply flat bill discount of ₹100.<br>3. Inspect calculations in ledger. | • Taxable Subtotal = ₹900.00.<br>• GST (5%) = ₹45.00 (calculated on ₹900, NOT ₹1,000).<br>• Net Payable = ₹945.00.<br>• Round Off = ₹0.00. | GST must equal ₹45.00. If GST is ₹50.00, calculation order is failing. |
| **TC-FIN-02** | Round-Off Adjustment (+ve round up) | 1. Add item: ₹980 gross, 5% GST.<br>2. Apply discount: ₹50.<br>3. Inspect ledger and invoice. | • Taxable Subtotal = ₹930.00.<br>• 5% GST = ₹46.50.<br>• Exact Net = ₹976.50.<br>• Net Payable = ₹977.00.<br>• Round Off Adjustment = `+₹0.50`. | Net total must be exactly ₹977.00, and a `Round Off Adjustment` row of `+₹0.50` must be visible. |
| **TC-FIN-03** | Round-Off Adjustment (-ve round down) | 1. Add item: ₹105.00 gross, 18% GST.<br>2. Apply discount: ₹10.00.<br>3. Inspect ledger. | • Taxable = ₹95.00.<br>• 18% GST = ₹17.10.<br>• Exact Net = ₹112.10.<br>• Net Payable = ₹112.00.<br>• Round Off Adjustment = `-₹0.10`. | Net total must round to ₹112.00 with `-₹0.10` round off row. |
| **TC-FIN-04** | Telangana Intra-State Supply (36) | 1. Set store GSTIN starting with `36` (e.g. `36AAAAA0000A1Z5`).<br>2. Select customer with Telangana GSTIN (`36BBBBB1111B1Z2`) or no GSTIN.<br>3. Settle bill with 18% GST. | • Place of Supply indicates `Intra-State (Telangana - 36)`.<br>• Tax is split into `CGST (9%)` and `SGST (9%)`.<br>• HSN table shows CGST and SGST columns. | Tax must be split 50/50 between CGST and SGST. No IGST column should appear. |
| **TC-FIN-05** | Inter-State Supply (IGST) | 1. Select customer with Andhra Pradesh GSTIN starting with `37` (e.g. `37CCCCC2222C1Z3`).<br>2. Settle bill with 18% GST.<br>3. Inspect A4 invoice and thermal slip. | • Place of Supply indicates `Inter-State (Code 37)`.<br>• Table header replaces CGST/SGST with `IGST (18%)`.<br>• HSN summary table reflects IGST rate & amount. | Table must NOT show CGST or SGST. Entire 18% must be labeled IGST. |
| **TC-FIN-06** | Zero-Rated / Exempt Items | 1. Add item with 0% GST.<br>2. Settle bill. | • Tax amount displays ₹0.00.<br>• Net total equals taxable value.<br>• Round off is ₹0.00. | No tax should be added. |

---

### Test Suite 2: Inventory Integrity & Stock Lifecycle

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-INV-01** | Inventory Stock Deduction | 1. Note Product A stock = 10.<br>2. Bill 3 units of Product A.<br>3. Settle transaction.<br>4. Check inventory list. | • Product A stock immediately displays 7 units.<br>• Firestore `products` collection decrements quantity atomically. | Stock must decrease by exactly 3. |
| **TC-INV-02** | Cart Quantity Ceiling Guardrail | 1. Product B has stock = 4.<br>2. Add Product B to cart.<br>3. Click quantity `+` button 5 times. | • Quantity stops incrementing at 4.<br>• Toast warning alerts cashier: "Cannot exceed available stock (4)". | Cart quantity cannot exceed physical stock under any circumstance. |
| **TC-INV-03** | Stock Replenishment on Bill Deletion | 1. Settle an invoice containing 5 units of Product C.<br>2. Stock of Product C is now 15 (was 20).<br>3. Navigate to **History**.<br>4. Delete the invoice.<br>5. Check inventory. | • Product C stock is immediately restored to 20.<br>• Both local UI and Firestore reflect restored stock. | Stock must replenish automatically upon deletion without manual entry. |
| **TC-INV-04** | CSV Import with Dynamic Mapping | 1. Prepare CSV with custom columns (`Size`, `Warranty`).<br>2. Open **Inventory** $\rightarrow$ **Import CSV**.<br>3. Select Category.<br>4. Map CSV columns to Category Custom Fields.<br>5. Click Import. | • All products created in Firestore.<br>• Custom fields populated in `product.customFields`.<br>• Products display custom attributes in product modal. | Custom fields must be properly populated and not lost or placed in unstructured strings. |

---

### Test Suite 3: Hardware Peripherals & Barcode Scanner

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-HW-01** | USB Barcode Wedge Detection | 1. Open POS Billing screen.<br>2. Ensure no input field is focused.<br>3. Scan barcode with physical USB scanner (or simulate rapid keypresses <160ms ending in Enter). | • Product matching the scanned barcode is added to the cart.<br>• Web Audio dual-tone confirmation chime sounds. | Scanner input must be captured globally without requiring cursor focus in an input box. |
| **TC-HW-02** | Barcode Scan Existing Item | 1. Product X already has quantity 1 in cart.<br>2. Scan barcode of Product X. | • Quantity increments to 2.<br>• Web Audio confirmation chime sounds.<br>• Cart total updates immediately. | Item quantity increments without creating a duplicate row. |
| **TC-HW-03** | Barcode Not Found Handling | 1. Scan barcode not registered in inventory (e.g. `9999999999999`). | • Warning toast: "Product with barcode 9999999999999 not found".<br>• Cart remains unchanged. | No crash or silent failure. Cashier must be informed via toast. |
| **TC-HW-04** | POS Keyboard Shortcuts | 1. In active cart, press `[F4]`.<br>2. Press `[F8]`.<br>3. Press `[Esc]`.<br>4. Re-add item and press `[Ctrl + Enter]`. | • `[F4]` switches payment to Cash.<br>• `[F8]` switches payment to UPI.<br>• `[Esc]` clears the cart with confirmation.<br>• `[Ctrl + Enter]` opens confirmation & settles bill. | All 4 hotkeys trigger their designated actions without browser conflict. |

---

### Test Suite 4: Print Engine & Layout Pagination

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-PRN-01** | 80mm Thermal Receipt Generation | 1. Complete bill.<br>2. Choose **80mm Thermal Slip** in preview modal.<br>3. Click Print. | • Isolated thermal layout renders cleanly.<br>• Correct monospace alignment.<br>• Store header, customer details, itemized lines, and Section 15(3) taxes present.<br>• No UI headers or sidebars printed. | Thermal slip prints inside the 80mm printable width without line wrapping or truncation. |
| **TC-PRN-02** | Single-Page A4 Invoice (<6 items) | 1. Settle bill with 3 items.<br>2. View **Letter / A4 Commercial Invoice**.<br>3. Inspect layout. | • Table spacer expands cleanly to keep total summary and signature aligned at the bottom.<br>• Document fits entirely on 1 sheet of A4. | Exactly 1 page. No overflow to Page 2. |
| **TC-PRN-03** | Multi-Page A4 Invoice (>15 items) | 1. Settle bill with 20 items.<br>2. View **Letter / A4 Commercial Invoice**.<br>3. Open Print dialog. | • Table rows paginate cleanly with `break-inside: avoid`.<br>• Table spacer row is **disabled**.<br>• Summary block, HSN table, and signature box stay together without overlapping table rows. | No truncated rows, no overlap between line items and summary/signature boxes across multiple pages. |
| **TC-PRN-04** | Dynamic QR Code on Bill | 1. Set QR purpose to **UPI** $\rightarrow$ Verify UPI QR opens payment app.<br>2. Set QR purpose to **Google Review** $\rightarrow$ Scan QR with phone camera. | • Phone camera immediately resolves the configured Google Review or social URL.<br>• Header text reflects custom setting. | QR code is sharp, high-contrast, and scans cleanly on both screen and paper. |

---

### Test Suite 5: Customer CRM & Metric Rollback

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-CRM-01** | Customer Spend & Visit Accumulation | 1. Note Customer John: Visits = 2, Spend = ₹1,500.<br>2. Settle new invoice for John totaling ₹500.<br>3. Check Customer profile. | • Visits increments to 3.<br>• Spend increments to ₹2,000.<br>• New invoice listed in John's transaction history. | Metrics update immediately in UI and Firestore. |
| **TC-CRM-02** | Customer Spend & Visit Rollback | 1. From TC-CRM-01, delete the ₹500 invoice in **History**.<br>2. Inspect Customer profile. | • Visits decrements back to 2.<br>• Spend decrements back to ₹1,500.<br>• Invoice removed from purchase history. | Deleting an invoice must reverse customer lifetime stats accurately. |

---

### Test Suite 6: Category Dynamic Custom Fields & Casing

| Test ID | Test Scenario | Steps to Execute | Expected Result | Pass/Fail Criteria |
|---|---|---|---|---|
| **TC-CF-01** | Separate Column Configuration | 1. Add custom field `Size` with mode **Separate Column** (Header: `Size`).<br>2. Add product with Size = `XL`.<br>3. Bill product and view A4 invoice. | • Items table renders a dedicated `Size` column between Description and HSN.<br>• Cell renders `XL`.<br>• Table footer colspans align properly. | Column aligns with header and does not break table grid structure. |
| **TC-CF-02** | Merged Column Configuration | 1. Add custom field `Warranty` with mode **Merged into Column** $\rightarrow$ Target: `Description`.<br>2. Add product with Warranty = `2 Years`.<br>3. Bill product and view A4 invoice. | • Warranty rendered directly below item description as `Warranty: 2 Years`.<br>• No extra table column added. | Clean secondary line beneath product title. |
| **TC-CF-03** | Text Casing Enforcement | 1. Set custom field text casing to **Uppercase**.<br>2. Enter value in lowercase: `navy blue`.<br>3. Inspect invoice preview. | • Value rendered as `NAVY BLUE`. | Casing transformation applied automatically to print document. |

---

## 5. Mathematical Specification & Verification Walkthrough

### 5.1 The Calculation Flowchart
```
[ Gross Line Items Sum: Σ(Price × Qty) ]
                   │
                   ▼
      [ Deduct Item-Level Discounts ]
                   │
                   ▼
          [ Gross Subtotal ]
                   │
                   ▼
      [ Deduct Bill-Level Discount ] ◄── Indian GST Section 15(3) Order
                   │
                   ▼
       [ Final Taxable Value ]
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
[ Intra-State (36) ]    [ Inter-State ]
  CGST: Taxable × (R/2)   IGST: Taxable × R
  SGST: Taxable × (R/2)        │
       └───────────┬───────────┘
                   ▼
           [ Exact Net Total ]
   (Final Taxable Value + Total GST)
                   │
                   ▼
         [ Round Off Calculation ]
   Net Payable = Math.round(Exact Net)
   Round Off   = Net Payable - Exact Net
```

### 5.2 Real-World Calculation Verification Case

Consider a retail sale with the following items and discounts:
- **Item 1**: Mechanical Keyboard — Price: ₹800.00, Qty: 1, GST: 18%
- **Item 2**: Mouse Pad — Price: ₹180.00, Qty: 1, GST: 5%
- **Gross Subtotal**: ₹980.00
- **Bill Discount Coupon (WELCOME50)**: -₹50.00

#### Step 1: Compute Final Taxable Value (Sec 15(3))
$$\text{Taxable Value} = \text{Gross Subtotal} - \text{Discount} = ₹980.00 - ₹50.00 = ₹930.00$$
$$\text{Proportional Ratio} = \frac{₹930.00}{₹980.00} \approx 0.94897959$$

#### Step 2: Proportional Item Tax Allocation
- **Item 1 Taxable Base**: $₹800.00 \times 0.94897959 = ₹759.1837$
  $$\text{Item 1 GST (18\%)} = ₹759.1837 \times 18\% = ₹136.653$$
- **Item 2 Taxable Base**: $₹180.00 \times 0.94897959 = ₹170.8163$
  $$\text{Item 2 GST (5\%)} = ₹170.8163 \times 5\% = ₹8.541$$
- **Total GST**: $₹136.653 + ₹8.541 = ₹145.194 \approx ₹145.19$

#### Step 3: Exact Net & Round Off
$$\text{Exact Net} = ₹930.00 + ₹145.19 = ₹1,075.19$$
$$\text{Net Payable} = \text{round}(₹1,075.19) = ₹1,075.00$$
$$\text{Round Off Adjustment} = ₹1,075.00 - ₹1,075.19 = -₹0.19$$

**Result on Invoice**:
```
Gross Subtotal:          ₹980.00
Bill Discount:           -₹50.00
Taxable Value (Sec 15):  ₹930.00
CGST (Split):             ₹72.60
SGST (Split):             ₹72.60
Round Off Adjustment:     -₹0.19
--------------------------------
TOTAL PAYABLE:         ₹1,075.00
```

---

## 6. Security, Persistence & Zero-Leakage Policy

1. **No Unencrypted / Sensitive `localStorage`**:
   - Billo strictly forbids storing customer financial records, invoices, or secret keys in browser `localStorage`.
   - All state is managed in reactive memory (`POSContext`) and synchronized directly with Google Firebase Firestore.
2. **Atomic Inventory Control**:
   - Stock increments and decrements use atomic field updates (`increment(quantity)`) to prevent race conditions during simultaneous billing.
3. **Data Segregation**:
   - Internal staff notes are stripped from print templates and customer-facing view models.

---

## 7. QA Test Sign-Off Checklist

Before releasing or demonstrating to retail clients, ensure all items below are verified:

- [ ] `npx tsc --noEmit` exits with **0 errors**.
- [ ] Section 15(3) tax calculation verified with discount applied before GST.
- [ ] Round-Off row displays whenever exact total has fractional paise.
- [ ] USB barcode scanner adds products with confirmation audio tone.
- [ ] Cart stepper prevents adding more items than available in inventory.
- [ ] Deleting an invoice restores inventory counts and decrements customer spend.
- [ ] Invoices with Telangana GSTIN show CGST + SGST; other states show IGST.
- [ ] Invoices with $>15$ items paginate cleanly over multiple A4 sheets without overlapping footers.
- [ ] 80mm thermal receipt renders crisp monospace layout with correct totals.
- [ ] UPI QR code scans and opens payment apps with exact invoice amount pre-filled.

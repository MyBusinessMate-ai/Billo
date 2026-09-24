import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase credentials missing in .env')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 20 strictly ONE-WORD item names with strictly ONE-WORD descriptions
const CATALOG_ITEMS = [
  { name: 'Keyboard', desc: 'Mechanical', price: 1200, gst: 18, hsn: '84716040' },
  { name: 'Monitor', desc: 'Curved', price: 8500, gst: 18, hsn: '85285200' },
  { name: 'Mouse', desc: 'Wireless', price: 650, gst: 18, hsn: '84716060' },
  { name: 'Headphones', desc: 'Bluetooth', price: 2400, gst: 18, hsn: '85183000' },
  { name: 'Charger', desc: 'Fast', price: 450, gst: 18, hsn: '85044030' },
  { name: 'Cable', desc: 'Braided', price: 180, gst: 18, hsn: '85444299' },
  { name: 'Battery', desc: 'Lithium', price: 320, gst: 18, hsn: '85065000' },
  { name: 'Speaker', desc: 'Portable', price: 1500, gst: 18, hsn: '85182100' },
  { name: 'Camera', desc: 'Webcam', price: 1950, gst: 18, hsn: '85258900' },
  { name: 'Laptop', desc: 'Slim', price: 42000, gst: 18, hsn: '84713010' },
  { name: 'Tablet', desc: 'Graphic', price: 6200, gst: 18, hsn: '84713090' },
  { name: 'Router', desc: 'Gigabit', price: 2100, gst: 18, hsn: '85176290' },
  { name: 'Printer', desc: 'Thermal', price: 4800, gst: 18, hsn: '84433210' },
  { name: 'Scanner', desc: 'Handheld', price: 2800, gst: 18, hsn: '84719000' },
  { name: 'Drive', desc: 'External', price: 3500, gst: 18, hsn: '84717020' },
  { name: 'Adapter', desc: 'Universal', price: 390, gst: 18, hsn: '85366990' },
  { name: 'Microphone', desc: 'Condenser', price: 1850, gst: 18, hsn: '85181000' },
  { name: 'Stand', desc: 'Aluminum', price: 550, gst: 18, hsn: '83024900' },
  { name: 'Hub', desc: 'Powered', price: 950, gst: 18, hsn: '84718000' },
  { name: 'Light', desc: 'Dimmable', price: 720, gst: 18, hsn: '94054090' },
]

async function createBillWithNItems(itemCount) {
  const paddedId = String(itemCount).padStart(6, '0')
  const billingId = `INV-2026-${paddedId}`

  // Pick first itemCount items
  const itemsSlice = CATALOG_ITEMS.slice(0, itemCount)

  const items = itemsSlice.map((it, idx) => ({
    productId: `PROD-TEST-${idx + 1}`,
    categoryId: 'CAT-ELECTRONICS',
    categoryName: 'Electronics',
    itemName: it.name,
    description: it.desc,
    quantity: 1,
    unitPrice: it.price,
    total: it.price,
    gstPercent: it.gst,
    hsn: it.hsn,
    discountAmount: 0,
    discountPercent: 0,
  }))

  const subtotal = items.reduce((sum, it) => sum + it.total, 0)
  const taxAmount =
    Math.round(items.reduce((sum, it) => sum + (it.total * (it.gstPercent || 0)) / 100, 0) * 100) /
    100
  const exactNet = subtotal + taxAmount
  const total = Math.round(exactNet)
  const roundOff = Math.round((total - exactNet) * 100) / 100

  const billingDoc = {
    billingId,
    customerId: 'CUST-TEST',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul.verma@example.com',
    customerGstin: '36AAAAA0000A1Z5',
    placeOfSupply: 'Intra-State (Telangana - 36)',
    isInterState: false,
    billMode: 'cash',
    invoiceFormat: 'a4',
    items,
    subtotal,
    taxPercent: 18,
    taxAmount,
    discountAmount: 0,
    total,
    roundOff,
    status: 'completed',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  const docRef = doc(db, 'billings', billingId)
  await setDoc(docRef, billingDoc)
  console.log(
    `✅ Created Bill: ${billingId} with ${itemCount} items (Format: A4, Total: ₹${total.toLocaleString('en-IN')})`
  )
}

async function main() {
  console.log(
    '🚀 Seeding test bills with 12 to 20 items (Format: A4, Single-word Name & Description)...\n'
  )

  for (let count = 12; count <= 20; count++) {
    await createBillWithNItems(count)
  }

  console.log('\n🎉 Successfully created all test bills from 12 to 20 items!')
  console.log(
    'You can now open the Billo app -> History screen to test each bill in A4/Letter format.\n'
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error seeding bills:', err)
  process.exit(1)
})

// .env.local のリモート Supabase 接続を確認する。Docker なしの開発で最初に叩く。
// 使い方: npm run check:remote
import { readFile } from 'node:fs/promises'

const ENV_FILES = ['.env.local', '.env']

async function loadEnv() {
  for (const file of ENV_FILES) {
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      const key = m[1]
      if (process.env[key]) continue
      let value = m[2].trim().replace(/\s+#.*$/, '')
      if (/^".*"$|^'.*'$/.test(value)) value = value.slice(1, -1)
      process.env[key] = value
    }
  }
}

function fail(message) {
  console.error(`NG: ${message}`)
  process.exitCode = 1
}

await loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || url.includes('<project>')) {
  fail('NEXT_PUBLIC_SUPABASE_URL が未設定。.env.example をコピーして値を入れる')
}
if (!anonKey || anonKey.includes('<anon-key>')) {
  fail('NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定')
}
if (process.exitCode) process.exit(1)

const isLocal = /127\.0\.0\.1|localhost/.test(url)
console.log(`接続先: ${url}${isLocal ? '（ローカル / Docker）' : '（リモート）'}`)

const REQUIRED_TABLES = ['brands', 'products', 'product_colors', 'reviews']

for (const table of REQUIRED_TABLES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  }).catch((error) => {
    fail(`${table}: 接続失敗 (${error.message})`)
    return null
  })
  if (!res) continue
  if (res.status === 404) {
    fail(`${table}: テーブルが無い。マイグレーション未適用（npm run db:push）`)
    continue
  }
  if (!res.ok) {
    fail(`${table}: HTTP ${res.status} ${await res.text()}`)
    continue
  }
  const rows = await res.json()
  console.log(`OK: ${table}${rows.length === 0 ? '（0件。シード未投入の可能性）' : ''}`)
}

const rpc = await fetch(`${url}/rest/v1/rpc/lab_delta_e`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ lab1: [50, 10, 10], lab2: [50, 10, 10] }),
}).catch((error) => {
  fail(`lab_delta_e: 接続失敗 (${error.message})`)
  return null
})
if (rpc) {
  if (rpc.ok) console.log('OK: lab_delta_e')
  else fail(`lab_delta_e: HTTP ${rpc.status}。関数のマイグレーションが未適用`)
}

if (process.exitCode) {
  console.error('\nREADME の「Docker なしで開発する」を参照')
} else {
  console.log('\nすべて OK。npm run dev で起動できる')
}

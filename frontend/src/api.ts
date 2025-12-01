export type SignalResponse = {
  ticker: string
  price: number
  signal: 'STRONG BUY' | 'HOLD'
  confidence: number
  timestamp: number
  features: Record<string, number>
  model_loaded: boolean
  note?: string
}

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000/api'

export async function fetchSignal(ticker: string): Promise<SignalResponse> {
  const res = await fetch(`${API_BASE}/signals?ticker=${encodeURIComponent(ticker)}`)
  if (!res.ok) throw new Error('Failed to fetch signal')
  return res.json()
}

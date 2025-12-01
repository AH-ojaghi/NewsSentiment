import React from 'react'

type Props = {
  signal: 'STRONG BUY' | 'HOLD'
  confidence: number
}

export default function SignalCard({ signal, confidence }: Props) {
  const isBuy = signal === 'STRONG BUY'
  return (
    <div
      className={`glass-card brand-ring p-6 hover-rise ${isBuy ? 'buy-glow border-green-500/40' : 'border-yellow-500/30'}`}
    >
      <div className='flex items-center justify-between'>
        <div>
          <div className='stat-label'>Model Signal</div>
          <div className={stat-value }>
            {signal}
          </div>
        </div>
        <div className='text-right'>
          <div className='stat-label'>Confidence</div>
          <div className='stat-value'>{confidence.toFixed(2)}%</div>
        </div>
      </div>
      <div className='mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden'>
        <div
          className={`h-full ${isBuy ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }} 
        />
      </div>
    </div>
  )
}

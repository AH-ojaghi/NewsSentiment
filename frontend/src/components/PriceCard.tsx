import React from 'react'

type Props = {
  ticker: string
  price: number
  timestamp: number
  modelLoaded: boolean
}

export default function PriceCard({ ticker, price, timestamp, modelLoaded }: Props) {
  const dt = new Date(timestamp * 1000)
  return (
    <div className='glass-card brand-ring p-6 hover-rise'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='stat-label'>Ticker</div>
          <div className='stat-value gradient-title'>{ticker}</div>
        </div>
        <div className='text-right'>
          <div className='stat-label'>Live Price</div>
          <div className='stat-value'></div>
        </div>
      </div>
      <div className='mt-3 text-xs text-gray-400'>
        Last update: {dt.toLocaleString()} â€¢ Model: {modelLoaded ? 'Loaded' : 'Not Loaded'}
      </div>
    </div>
  )
}

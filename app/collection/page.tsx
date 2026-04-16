'use client'

import dynamic from 'next/dynamic'

const CollectionMap = dynamic(() => import('./CollectionMap'), { ssr: false })

export default function CollectionPage() {
  return <CollectionMap />
}

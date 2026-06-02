import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'InsurePro — Sales Platform',
  description: 'The all-in-one platform for insurance sales teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' },
          }}
        />
      </body>
    </html>
  )
}

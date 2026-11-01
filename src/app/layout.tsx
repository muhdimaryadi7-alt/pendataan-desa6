import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pendataan Warga RW 01',
  description: 'Data penduduk, kas, iuran, dan rapat RW 01 — rapi dan transparan.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#047857' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  )
}

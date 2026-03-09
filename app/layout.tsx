import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CoachBoard — Plataforma de gestión para entrenadores',
  description:
    'Planifica entrenamientos, gestiona atletas y visualiza el progreso de tus deportistas en tiempo real.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${geistSans.variable} antialiased bg-slate-950 text-slate-50`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

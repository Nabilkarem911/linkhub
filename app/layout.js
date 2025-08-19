import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'LinkFolio - Your Link-in-Bio Platform',
  description: 'Create and customize your own link-in-bio page with LinkFolio',
  keywords: 'link in bio, social media links, personal website, profile links',
  authors: [{ name: 'LinkFolio' }],
  creator: 'LinkFolio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LinkFolio',
    title: 'LinkFolio - Your Link-in-Bio Platform',
    description: 'Create and customize your own link-in-bio page with LinkFolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinkFolio - Your Link-in-Bio Platform',
    description: 'Create and customize your own link-in-bio page with LinkFolio',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
import "./globals.css";
import { Schibsted_Grotesk, Slabo_13px } from 'next/font/google'

const schibsted = Schibsted_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: "--font-display"
})

const slabo = Slabo_13px({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: "--font-logo",
  weight: '400',
})

const APP_NAME = "Determinist";
const APP_DEFAULT_TITLE = "Determinist";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION = "A deterministic password generator you can use anywhere!";

export const metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${schibsted.variable} ${slabo.variable}`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="grid place-items-center">{children}</body>
    </html>
  );
}

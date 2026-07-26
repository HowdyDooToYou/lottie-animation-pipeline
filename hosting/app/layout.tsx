import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MotionProof</title>
        <meta
          name="description"
          content="Prompt-to-Lottie compiler with browser-certified production proof."
        />
        <link rel="icon" href="/studio/motionproof-mark.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}

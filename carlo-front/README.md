This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Responsive chat verification

From `carlo-front`, `npm run check:independent` creates a temporary checkout with a fresh npm cache, installs only frontend dependencies, and runs typecheck, lint, tests and a production build. It also rejects frontend imports of backend source files.

With a local frontend running and Playwright browsers installed, run:

```powershell
$env:ACUTIS_BROWSER_ORIGIN = 'http://127.0.0.1:3000'
npm run test:browser -- tests/browser/chat-responsive.spec.ts tests/browser/chat-manual-scroll.spec.ts
```

The responsive suite checks 1440×900, 1366×768, 768×1024, 430×932, 390×844 and 360×800; compositor bounds and touch targets; the mobile Santos link/menu; history drawer; multiline input; anonymous chat; and translated layouts. It saves initial-layout screenshots and measurements. Existing manual-scroll tests sample document/window/chat positions throughout sending, receiving, errors and language changes.

AI responses and sessions in these tests are synthetic. Keyboard coverage simulates both visual-viewport and layout-viewport resizing; it does not launch a native phone keyboard. The 200% reflow test uses 683×384 CSS pixels, equivalent to the available layout area of a 1366×768 desktop at 200% zoom. Physical-device keyboard and native browser zoom checks remain useful before a release. Mobile WebKit does not expose a Playwright mouse-wheel action, so its error/scroll regression models an intentional viewport displacement with `scrollBy` and verifies that the response preserves that position; this is not a native swipe test. Desktop and Android profiles retain the real wheel action.

The chat follows the dynamic viewport and listens only to VisualViewport resize events. It never scrolls the document on send, reply or resize, and ignores pinch-zoom resizing. See [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport). The existing explicit “explore” button still scrolls to the content requested by the user.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

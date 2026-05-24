import type { Metadata } from "next";
import Script from "next/script";

import { Providers } from "../components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LDC Operations",
  description: "Internal Catholic matchmaking operations console"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <Script id="ldc-client-logger" strategy="beforeInteractive">{`
          (function() {
            function send(level, message, extra) {
              try {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/log', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(Object.assign({ level: level, message: message }, extra || {})));
              } catch(e) {}
            }

            // Uncaught JS errors
            window.onerror = function(msg, src, line, col, err) {
              send('ERROR', String(msg), {
                stack: err ? err.stack : null,
                url: src, line: line, col: col
              });
            };

            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', function(e) {
              var reason = e.reason;
              send('UNHANDLED_REJECTION', reason && reason.message ? reason.message : String(reason), {
                stack: reason && reason.stack ? reason.stack : null
              });
            });

            // Page lifecycle checkpoints
            send('INFO', 'Script tag executed — page parsing started');

            document.addEventListener('DOMContentLoaded', function() {
              send('INFO', 'DOMContentLoaded — bundles executing');
            });

            window.addEventListener('load', function() {
              send('INFO', 'window.load — all resources fetched');

              // Check if React actually hydrated after a delay
              setTimeout(function() {
                var shell = document.querySelector('.app-shell, .login-screen');
                if (shell) {
                  send('INFO', 'Hydration OK — found element: ' + shell.className);
                } else {
                  send('ERROR', 'Hydration FAILED — no .app-shell or .login-screen in DOM after 3s');
                }
              }, 3000);
            });
          })();
        `}</Script>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

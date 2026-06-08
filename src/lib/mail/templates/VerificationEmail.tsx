/** @jsxImportSource react */

interface Props {
  url: string;
}

export function VerificationEmail({ url }: Props) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily: "sans-serif",
          padding: "40px 0",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ backgroundColor: "#f59e0b", padding: "24px 32px" }}>
            <h1
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              LumoTrack
            </h1>
          </div>

          <div style={{ padding: "32px" }}>
            <h2
              style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}
            >
              Verify your email address
            </h2>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "15px",
                color: "#374151",
                lineHeight: "1.6",
              }}
            >
              Thanks for signing up for LumoTrack. Click the button below to
              verify your email address.
            </p>

            <a
              href={url}
              style={{
                display: "inline-block",
                backgroundColor: "#f59e0b",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Verify Email
            </a>

            <p
              style={{ margin: "24px 0 0", fontSize: "13px", color: "#9ca3af" }}
            >
              This link expires in 24 hours. If you did not create an account,
              you can ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

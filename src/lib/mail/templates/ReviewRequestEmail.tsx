/** @jsxImportSource react */

interface Props {
  shipmentContent: string;
  reviewUrl: string;
}

export function ReviewRequestEmail({ shipmentContent, reviewUrl }: Props) {
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
              How was your delivery?
            </h2>
            <p
              style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280" }}
            >
              Your shipment was delivered. Let us know how the product and the
              driver did.
            </p>

            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                SHIPMENT
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {shipmentContent}
              </p>
            </div>

            <a
              href={reviewUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#f59e0b",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: "6px",
              }}
            >
              Leave a review
            </a>
          </div>

          <div style={{ padding: "16px 32px", borderTop: "1px solid #f3f4f6" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
              You received this email because you are the recipient of a
              shipment tracked on LumoTrack.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

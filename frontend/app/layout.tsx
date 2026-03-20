import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToolMonkey — LLM Agent Reliability Testing",
  description: "Inject controlled failures into LLM tool-calling agents. Measure exactly how they break.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#1e1714" }}>
        {children}
      </body>
    </html>
  );
}

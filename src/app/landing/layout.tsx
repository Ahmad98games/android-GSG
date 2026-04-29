import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Omnora Noxis Global | The Future of Textile Intelligence",
  description: "Decoupled & Decentralized Edge-Computing Mesh ERP with YOLOv8 Vision AI. 0% Latency, 100% Privacy.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { Sidebar } from '@/components/studio/Sidebar';
import { AIPanel } from '@/components/studio/AIPanel';
import { StudioProvider } from '@/lib/studio-context';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioProvider>
      <div className="grid grid-cols-[240px_1fr_300px] h-screen border-t border-edge bg-cream overflow-hidden">
        <Sidebar />
        <div className="flex flex-col min-w-0 overflow-hidden">{children}</div>
        <AIPanel />
      </div>
    </StudioProvider>
  );
}

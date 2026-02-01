export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div data-testid="onboarding-layout" className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

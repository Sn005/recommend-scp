export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      data-testid="onboarding-layout"
      className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800"
    >
      {children}
    </div>
  );
}

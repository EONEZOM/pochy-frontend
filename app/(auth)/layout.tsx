/**
 * 로그인·검증 등 — 루트 `main`의 `pb-14`(하단 내비 여백)과 겹치지 않게 높이 체인만 잡습니다.
 * 하단 내비는 `/login` 등에서 숨겨지므로 여백은 시각적으로 비어 있을 수 있습니다.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col [-webkit-tap-highlight-color:transparent]">
      {children}
    </div>
  );
}

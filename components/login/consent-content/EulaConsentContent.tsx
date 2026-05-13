export const EulaConsentContent = () => {
  return (
    <div className="text-mono-jet space-y-3 text-sm leading-5 font-normal">
      <p>
        본 계약은 <strong>포치</strong> 운영팀(이하 &apos;회사&apos;)과 서비스를 이용하는
        이용자(이하 &apos;사용자&apos;) 간에 체결되는 법적 계약입니다. 사용자가 서비스를
        설치하거나 이용하는 것은 본 계약의 모든 조항에 동의함을 의미합니다.
      </p>

      <h3 className="text-sm leading-5 font-bold">제1조 (라이선스의 부여)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          회사는 사용자에게 본 서비스를 개인적, 비상업적 용도로 사용할 수 있는
          제한적이고, 비독점적이며, 양도 불가능한 라이선스를 부여합니다.
        </li>
        <li>
          본 라이선스는 사용자가 본 계약 및 서비스 이용약관을 준수하는 것을 전제로
          유지됩니다.
        </li>
      </ol>

      <h3 className="text-sm leading-5 font-bold">제2조 (지적재산권)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          서비스와 관련된 모든 소프트웨어 코드, UI/UX 디자인, 로고, AI 분석 알고리즘
          등에 대한 지적재산권은 황예은 팀장 및 포치 운영팀에 귀속됩니다.
        </li>
        <li>
          사용자는 서비스를 역설계(Reverse Engineering), 분해, 모방하는 등 회사의
          지적재산권을 침해하는 행위를 해서는 안 됩니다.
        </li>
      </ol>

      <h3 className="text-sm leading-5 font-bold">제3조 (사용자 콘텐츠 및 권리)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          사용자가 서비스에 업로드한 이미지 및 작성한 메모(콘텐츠)에 대한 권리는
          원칙적으로 사용자에게 있습니다.
        </li>
        <li>
          단, 사용자는 서비스 제공(이미지 분석, 데이터 동기화 등)을 위해 필요한 범위
          내에서 회사가 해당 콘텐츠를 복제, 저장, 가공할 수 있는 권한을 부여합니다.
        </li>
        <li>
          <strong>비공개 아카이빙 원칙</strong>: 사용자가 위시리스트에 저장한 콘텐츠는
          원칙적으로 다른 사용자에게 노출되지 않으며, 사적 이용의 범위 내에서
          관리됩니다.
        </li>
        <li>
          사용자가 제작한 파우치는 타 사용자에게 공개/비공개를 선택할 수 있습니다.
        </li>
      </ol>

      <h3 className="text-sm leading-5 font-bold">제4조 (이용자의 의무 및 면책)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          사용자는 제3자의 초상권 및 저작권을 침해하는 이미지(인스타그램 릴스 캡처, 모델
          사진 등)를 업로드함에 있어 발생하는 모든 법적 책임을 전적으로 부담합니다.
        </li>
        <li>
          회사는 사용자가 업로드한 콘텐츠가 제3자의 권리를 침해하는 경우, 별도의 통지
          없이 해당 콘텐츠의 노출을 제한하거나 삭제할 수 있는 권한을 가집니다.
        </li>
        <li>
          사용자는 서비스를 상업적 목적으로 재배포하거나, 타인의 개인정보를 무단으로
          수집하는 용도로 사용할 수 없습니다.
        </li>
      </ol>

      <h3 className="text-sm leading-5 font-bold">제5조 (AI 분석 결과에 대한 고지)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          본 서비스의 AI 인식 기능(<strong>F-01</strong>)을 통해 제공되는 제품
          정보(제품명, 브랜드, 가격 등)는 학습 데이터 및 알고리즘에 따라 실제 정보와
          차이가 있을 수 있습니다.
        </li>
        <li>
          회사는 AI 분석 결과의 정확성 및 신뢰성을 100% 보장하지 않으며, 부정확한
          정보로 인해 발생하는 사용자의 손해에 대해 책임을 지지 않습니다.
        </li>
      </ol>

      <h3 className="text-sm leading-5 font-bold">제6조 (계약의 해지)</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          사용자는 언제든지 서비스 앱 삭제 및 회원 탈퇴를 통해 본 계약을 해지할 수
          있습니다.
        </li>
        <li>
          회사는 사용자가 본 계약을 위반한 경우 지체 없이 라이선스를 철회하고 서비스
          이용을 제한할 수 있습니다.
        </li>
      </ol>
    </div>
  );
};

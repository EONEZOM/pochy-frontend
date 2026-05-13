const tableClassName =
  'w-full min-w-[240px] border-collapse text-left text-xs leading-4';
const cellClassName = 'border-mono-gray border px-2 py-1.5 align-top';
const headerCellClassName = `${cellClassName} font-bold`;

export const OptionalPersonalInfoConsentContent = () => {
  return (
    <div className="text-mono-jet space-y-3 text-sm leading-5 font-normal">
      <p>
        개인정보보호법 등 관련 법규에 의거하면 포치는 고객님의 개인정보 수집 및
        이용에 대해 개인정보 수집 및 이용 동의서를 받고 있습니다.
      </p>
      <p>
        개인정보 제공자가 동의한 내용 외의 다른 목적으로 활용하지 않겠습니다.
      </p>

      <div className="overflow-x-auto">
        <table className={tableClassName}>
          <thead>
            <tr>
              <th className={headerCellClassName}>구분</th>
              <th className={headerCellClassName}>내용</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={headerCellClassName} scope="row">
                개인정보를 제공받는 자
              </th>
              <td className={cellClassName}>포치</td>
            </tr>
            <tr>
              <th className={headerCellClassName} scope="row">
                개인정보를 제공받는 자의 이용 목적
              </th>
              <td className={cellClassName}>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>회원 가입 및 관리</strong>: 서비스 이용에 따른 본인
                    식별, 회원 자격 유지 및 관리, 부정이용 방지
                  </li>
                  <li>
                    <strong>서비스 제공</strong>: AI를 활용한 화장품 이미지 분석 및
                    제품 정보(제품명, 브랜드, 가격, 카테고리) 추출, 개인화된
                    위시리스트 저장 및 메모 관리.
                  </li>
                  <li>
                    <strong>서비스 개선 및 개발</strong>: 서비스 이용 기록 분석을
                    통한 품질 개선, 신규 기능(공유 피드, 스티커 등) 개발 및
                    최적화.
                  </li>
                </ul>
              </td>
            </tr>
            <tr>
              <th className={headerCellClassName} scope="row">
                제공하는 개인정보의 항목
              </th>
              <td className={cellClassName}>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>회원 정보</strong>: 이메일 주소, 닉네임, 사용자 고유
                    식별값
                  </li>
                  <li>
                    <strong>서비스 이용 정보</strong>: 사용자가 업로드한 화장품
                    이미지, 제품 정보(브랜드, 가격 등), 사용자 작성 메모.
                  </li>
                  <li>
                    <strong>자동 수집 정보</strong>: 서비스 방문 및 이용 기록, 검색
                    키워드, 정렬 및 필터 설정 값
                  </li>
                </ul>
              </td>
            </tr>
            <tr>
              <th className={headerCellClassName} scope="row">
                개인정보를 제공받는 자의 개인정보 보유 및 이용 기간
              </th>
              <td className={cellClassName}>
                원칙적으로는 회원 탈퇴 시까지 보유 및 이용합니다. 하지만 관계
                법령에 따라 보존 의무가 있는 경우 해당 법령에서 정한 기간 동안
                별도 DB에서 안전하게 보관 후 파기합니다.
              </td>
            </tr>
            <tr>
              <th className={headerCellClassName} scope="row">
                동의를 거부할 권리 및 동의를 거부할 경우의 불이익
              </th>
              <td className={cellClassName}>
                <p>개인정보 수집 동의를 거부할 수 있습니다.</p>
                <p className="mt-2">
                  다만 위 항목들을 포치의 핵심 기능인 AI 인식 및 아카이빙 서비스를
                  제공하기 위해 필요한 최소한의 정보입니다.
                </p>
                <p className="mt-2">
                  동의를 거부하실 경우 회원 가입이 제한되거나, 이미지 업로드 및
                  정보 자동 입력 등 서비스의 주요 기능을 이용하실 수 없습니다.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

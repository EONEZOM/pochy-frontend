const sectionClassName = 'text-sm leading-5 font-bold';
const listClassName = 'list-disc space-y-1 pl-5';
const orderedListClassName = 'list-decimal space-y-1 pl-5';

export const PrivacyConsentContent = () => {
  return (
    <div className="text-mono-jet space-y-3 text-sm leading-5 font-normal">
      <h2 className="text-sm leading-5 font-bold">Pochy 개인정보 처리방침</h2>
      <p>
        Pochy (이하 포치라 함)은(는) 정보주체의 자유와 권리 보호를 위해 ｢개인정보
        보호법｣ 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고
        안전하게 관리하고 있습니다. 이에 ｢개인정보 보호법｣ 제30조에 따라
        정보주체에게 개인정보의 처리와 보호에 관한 절차 및 기준을 안내하고, 이와
        관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이
        개인정보 처리방침을 수립·공개합니다.
      </p>

      <div className="space-y-1">
        <p className={sectionClassName}>&lt; 목차 &gt;</p>
        <ol className={orderedListClassName}>
          <li>개인정보 처리 목적</li>
          <li>처리하는 개인정보의 항목</li>
          <li>개인정보의 처리 및 보유 기간</li>
          <li>개인정보의 파기 절차 및 방법에 관한 사항</li>
          <li>개인정보 처리 업무의 위탁에 관한 사항</li>
          <li>정보주체와 법정대리인의 권리·의무 및 행사방법에 관한 사항</li>
          <li>
            개인정보 보호책임자의 성명 또는 개인정보 업무 담당부서 및 고충사항을
            처리하는 부서에 관한 사항
          </li>
          <li>정보주체의 권익침해에 대한 구제방법 권장</li>
          <li>개인정보 처리방침의 변경에 관한 사항</li>
        </ol>
      </div>

      <h3 className={sectionClassName}>1. 개인정보 처리 목적</h3>
      <p>
        포치는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는
        다음의 목적 외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는
        ｢개인정보 보호법｣ 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할
        예정입니다.
      </p>
      <ol className={orderedListClassName}>
        <li>
          <strong>회원 가입 및 관리</strong>
          <p className="mt-1">
            회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격
            유지·관리, 서비스 부정이용 방지, 각종 고지·통지, 고충처리 목적으로
            개인정보를 처리합니다.
          </p>
        </li>
        <li>
          <strong>재화 및 서비스 제공</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>AI 기반 화장품 정보 자동 입력</strong>: 업로드된 이미지 분석을
              통한 제품명, 브랜드, 가격, 카테고리 정보의 추출 및 제공.
            </li>
            <li>
              <strong>아카이빙 서비스 제공</strong>: 위시리스트 저장, 개인 메모 추가 및
              카테고리별 화장품 관리 기능 제공.
            </li>
            <li>
              <strong>통합 검색 및 관리</strong>: 제품 정보 및 메모 키워드를 활용한
              통합 검색, 리스트 정렬 및 필터링 기능 제공.
            </li>
          </ul>
        </li>
        <li>
          <strong>서비스 개선 및 분석</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>이용 행태 분석</strong>: 서비스 내 통합 검색 키워드 및 정렬·필터
              이용 기록 분석을 통한 서비스 최적화.
            </li>
            <li>
              <strong>품질 개선</strong>: AI 인식 모델의 정확도 측정 및 데이터 분석을
              통한 기능 고도화.
            </li>
          </ul>
        </li>
        <li>
          <strong>서비스 개발</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>신규 기능 개발</strong>: 파우치 공유 피드, 개인화 스캔 기능,
              파우치 꾸미기 스티커 기능 등 신규 서비스의 기획 및 개발.
            </li>
          </ul>
        </li>
      </ol>

      <h3 className={sectionClassName}>2. 처리하는 개인정보의 항목</h3>
      <p>
        포치는 다음과 같은 개인정보 법적 근거로 정보주체의 개인정보를 수집 및
        이용합니다.
      </p>
      <p className="font-bold">정보주체의 동의를 받지 않고 처리하는 개인정보 항목</p>
      <p>
        포치는 다음의 개인정보 항목을 정보주체의 동의 없이 처리하고 있습니다.
      </p>
      <ol className={orderedListClassName}>
        <li>
          <strong>회원 서비스 운영 및 관리</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>법적 근거</strong>: 「개인정보 보호법」 제15조제1항제4호(‘계약
              체결·이행’)
            </li>
            <li>
              <strong>처리하는 항목</strong>: 이메일 주소, 닉네임, 사용자 고유
              식별값(UID)
            </li>
          </ul>
        </li>
        <li>
          <strong>AI 기반 화장품 아카이빙 서비스 제공</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>법적 근거</strong>: 「개인정보 보호법」 제15조제1항제4호(‘계약
              체결·이행’)
            </li>
            <li>
              <strong>처리하는 항목</strong>: 사용자가 업로드한 이미지(화장품 사진
              등), AI 추출 제품 정보(제품명, 브랜드, 가격, 카테고리), 사용자가 작성한
              개인 메모
            </li>
          </ul>
        </li>
        <li>
          <strong>서비스 이용 편의 기능 제공</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>법적 근거</strong>: 「개인정보 보호법」 제15조제1항제4호(‘계약
              체결·이행’)
            </li>
            <li>
              <strong>처리하는 항목</strong>: 서비스 내 통합 검색 키워드, 정렬 및 필터
              설정 기록, 서비스 이용 기록(방문 일시 등)
            </li>
          </ul>
        </li>
        <li>
          <strong>고객 고충 및 상담 처리</strong>
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>법적 근거</strong>: 「개인정보 보호법」 제15조제1항제4호(‘계약
              체결·이행’)
            </li>
            <li>
              <strong>처리하는 항목</strong>: 이메일 주소, 상담 내용, 기기 정보(OS
              버전 등)
            </li>
          </ul>
        </li>
      </ol>

      <h3 className={sectionClassName}>3. 개인정보의 처리 및 보유 기간</h3>
      <ol className={orderedListClassName}>
        <li>
          포치는 법령에 따른 개인정보 보유·이용 기간 또는 계약의 체결·이행에 필요한
          기간, 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용
          기간 내에서 개인정보를 처리·보유합니다.
        </li>
        <li>
          각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
          <div className="mt-2 space-y-2">
            <p>
              <strong>가. 홈페이지 회원 가입 및 관리</strong>: 회원 탈퇴 시까지
            </p>
            <p className="pl-2">
              다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지
              보유합니다.
            </p>
            <ol className={`${orderedListClassName} pl-2`}>
              <li>
                관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당
                수사·조사 종료 시까지 보유합니다.
              </li>
              <li>
                홈페이지 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계
                정산 시까지 보유합니다.
              </li>
            </ol>
            <p>
              <strong>나. 서비스 제공</strong>: 아카이빙 서비스 제공 완료 시까지
            </p>
            <p className="pl-2">
              다만, 다음의 사유에 해당하는 경우에는 해당 기간 종료 시까지 관련
              정보를 보관합니다.
            </p>
            <ul className={`${listClassName} pl-2`}>
              <li>
                계약 또는 청약철회 등에 관한 기록: 5년 (「전자상거래 등에서의
                소비자보호에 관한 법률 시행령」 제6조제1항제2호)
              </li>
              <li>
                소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (「전자상거래
                등에서의 소비자보호에 관한 법률 시행령」 제6조제1항제4호)
              </li>
              <li>
                표시·광고에 관한 기록: 6개월 (「전자상거래 등에서의 소비자보호에
                관한 법률 시행령」 제6조제1항제1호)
              </li>
              <li>AI 이미지 분석 및 제품 정보 추출 기록: 서비스 제공 목적 달성 시까지</li>
            </ul>
            <p>
              <strong>다. 통신사실확인자료 보관</strong>
            </p>
            <ul className={`${listClassName} pl-2`}>
              <li>
                컴퓨터통신, 인터넷 로그기록자료, 접속지 추적자료: 3개월 (「통신비밀보호법」
                제15조의2제2항)
              </li>
            </ul>
          </div>
        </li>
      </ol>

      <h3 className={sectionClassName}>
        4. 개인정보의 파기 절차 및 방법에 관한 사항
      </h3>
      <ol className={orderedListClassName}>
        <li>
          포치는 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게
          되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
        </li>
        <li>
          정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리 목적이
          달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는
          경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를
          달리하여 보존합니다.
          <p className="mt-1">
            참고: 다른 법령에 따라 보존하는 항목(전자상거래법에 따른 결제 기록 등)은
            앞선 ‘개인정보의 처리 및 보유 기간’ 항목의 기준을 따릅니다.
          </p>
        </li>
        <li>
          개인정보 파기의 절차 및 방법은 다음과 같습니다.
          <ol className={`${orderedListClassName} mt-2`}>
            <li>
              <strong>파기절차</strong>
              <ul className={`${listClassName} mt-1`}>
                <li>
                  포치(POCHY)는 파기 사유가 발생한 개인정보(탈퇴 회원의 데이터 중
                  법정 보유 기간이 경과한 정보 등)를 선정합니다.
                </li>
                <li>
                  선정된 개인정보는 포치(POCHY)의 개인정보 보호책임자(황예은 팀장)의
                  승인을 받아 파기를 수행합니다.
                </li>
                <li>
                  내부 정책에 따라 정기적인 배치(Batch) 작업을 통해 파기 대상
                  데이터를 식별하고 일괄 삭제를 진행합니다.
                </li>
              </ul>
            </li>
            <li>
              <strong>파기방법</strong>
              <ul className={`${listClassName} mt-1`}>
                <li>
                  전자적 파일 형태: 데이터베이스에 기록·저장된 전자적 파일 형태의
                  개인정보는 기록을 재생할 수 없는 기술적 방법(Low Level Format, 데이터
                  영구 삭제 등)을 사용하여 파기하며, DB 내 소프트 딜리트된 레코드는
                  물리적 삭제를 통해 복구가 불가능하도록 처리합니다.
                </li>
                <li>
                  출력물 등: 종이 문서나 기타 물리적 매체에 기록된 개인정보가 있을
                  경우, 분쇄기로 분쇄하거나 소각하여 파기합니다.
                </li>
              </ul>
            </li>
          </ol>
        </li>
      </ol>

      <h3 className={sectionClassName}>5. 개인정보 처리 업무의 위탁에 관한 사항</h3>
      <ol className={orderedListClassName}>
        <li>
          포치(POCHY)는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리
          업무를 위탁하고 있습니다.
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[240px] border-collapse text-left text-xs leading-4">
              <thead>
                <tr className="border-mono-gray border-b">
                  <th className="border-mono-gray border px-2 py-1.5 font-bold">
                    위탁받는 자 (수탁자)
                  </th>
                  <th className="border-mono-gray border px-2 py-1.5 font-bold">
                    위탁 업무
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-mono-gray border px-2 py-1.5 align-top">
                    네이버 주식회사 (NAVER)
                  </td>
                  <td className="border-mono-gray border px-2 py-1.5 align-top">
                    AI 이미지 분석을 통한 화장품 객체 정보 추출 및 제품 상세 정보
                    검색/제공
                  </td>
                </tr>
                <tr>
                  <td className="border-mono-gray border px-2 py-1.5 align-top">
                    Google LLC (Youtube API)
                  </td>
                  <td className="border-mono-gray border px-2 py-1.5 align-top">
                    제품 정보를 기반으로 한 관련 유튜브 리뷰 영상 리스트 매칭 및
                    제공
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </li>
        <li>
          포치(POCHY)는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무
          수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한,
          수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에
          명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
        </li>
        <li>
          「개인정보 보호법」 제26조제6항에 따라 수탁자가 당사의 개인정보 처리 업무를
          재위탁하는 경우 포치(POCHY)의 동의를 받고 있으며, 본 개인정보 처리방침을
          통하여 재수탁자와 재위탁하는 업무의 내용을 공개하고 있습니다.
        </li>
        <li>
          위탁업무의 내용이나 수탁자가 변경될 경우에는 지체 없이 본 개인정보
          처리방침을 통하여 공개하도록 하겠습니다.
        </li>
        <li>
          포치(POCHY)는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 국외에
          위탁하고 있습니다.
          <ul className={`${listClassName} mt-1`}>
            <li>
              <strong>수탁자</strong>: Google LLC (YouTube)
            </li>
            <li>
              <strong>이전되는 국가</strong>: 미국
            </li>
            <li>
              <strong>이전 일시 및 방법</strong>: 유튜브 리뷰 리스트 호출 시
              네트워크를 통한 전송
            </li>
            <li>
              <strong>위탁업무 내용</strong>: 제품 관련 영상 콘텐츠 정보 연동
            </li>
          </ul>
        </li>
      </ol>

      <h3 className={sectionClassName}>
        6. 정보주체와 법정대리인의 권리·의무 및 행사방법에 관한 사항
      </h3>
      <ol className={orderedListClassName}>
        <li>
          정보주체는 포치에 대해 언제든지 개인정보 열람·전송·정정·삭제·처리정지 및
          동의 철회 등을 요구(이하 &quot;권리 행사&quot;라 함)할 수 있습니다.
          <p className="mt-1">
            ※ 14세 미만 아동의 권리 행사는 법정대리인이 직접 해야 하며, 14세 이상의
            미성년자인 정보주체는 정보주체의 개인정보에 관하여 미성년자 본인이 권리를
            행사하거나 법정대리인을 통하여 권리를 행사할 수 있습니다.
          </p>
        </li>
        <li>
          권리 행사는 포치에 대해 「개인정보 보호법 시행령」 제41조제1항에 따라 서면,
          전화, 전자우편, 인터넷 등을 통하여 하실 수 있으며, 포치는 이에 대해 지체
          없이 조치하겠습니다.
        </li>
        <li>
          권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여
          하실 수도 있습니다. 이 경우 &quot;개인정보 처리 방법에 관한 고시&quot;
          [별지 11] 서식에 따른 위임장을 제출하셔야 합니다.
        </li>
        <li>
          정보주체가 개인정보 열람 및 처리 정지를 요구할 권리는 「개인정보 보호법」
          제35조제4항 및 제37조 제2항에 의하여 제한될 수 있습니다.
        </li>
        <li>
          다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 해당
          개인정보의 삭제를 요구할 수 없습니다.
        </li>
        <li>포치는 권리 행사를 한 자가 본인이거나 정당한 대리인인지를 확인합니다.</li>
        <li>
          정보주체는 권리 행사를 아래의 부서에 할 수 있습니다. 포치(POCHY)는
          정보주체로부터 권리 행사를 청구받은 날로부터 10일(전송요구의 경우 지체
          없이) 이내 회신하겠습니다.
          <div className="mt-2 space-y-1">
            <p className="font-bold">▶ 개인정보 권리 행사 청구 접수·처리 부서</p>
            <ul className={listClassName}>
              <li>
                <strong>부서명</strong>: 포치 운영팀 (팀장 황예은)
              </li>
              <li>
                <strong>주 소</strong>: 경기도 김포시 (상세 주소 생략)
              </li>
              <li>
                <strong>연락처</strong>{' '}
                <a
                  href="mailto:apple110707@naver.com"
                  className="underline underline-offset-2"
                >
                  apple110707@naver.com
                </a>
              </li>
            </ul>
          </div>
        </li>
      </ol>

      <h3 className={sectionClassName}>
        7. 개인정보 보호책임자의 성명 또는 개인정보 업무 담당부서 및 고충사항을
        처리하는 부서에 관한 사항
      </h3>
      <ol className={orderedListClassName}>
        <li>
          포치는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
          관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보
          보호책임자를 지정하고 있습니다.
          <div className="mt-2 space-y-2">
            <div>
              <p className="font-bold">▶ 개인정보 보호책임자</p>
              <ul className={listClassName}>
                <li>
                  <strong>성명</strong>: 황예은
                </li>
                <li>
                  <strong>직위</strong>: 팀장
                </li>
                <li>
                  <strong>연락처</strong>:{' '}
                  <a
                    href="mailto:apple110707@naver.com"
                    className="underline underline-offset-2"
                  >
                    apple110707@naver.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold">▶ 개인정보보호 담당부서</p>
              <ul className={listClassName}>
                <li>
                  <strong>부서명</strong>: 포치 운영팀
                </li>
                <li>
                  <strong>연락처</strong>:{' '}
                  <a
                    href="mailto:apple110707@naver.com"
                    className="underline underline-offset-2"
                  >
                    apple110707@naver.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </li>
        <li>
          정보주체는 포치의 서비스를 이용하시면서 발생한 모든 개인정보보호 관련
          문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및
          개인정보보호 담당부서로 문의할 수 있습니다. 포치는 정보주체의 문의에 대해
          지체 없이 답변 및 처리해 드릴 것입니다.
        </li>
      </ol>

      <h3 className={sectionClassName}>
        8. 정보주체의 권익침해에 대한 구제방법 권장
      </h3>
      <p>
        정보주체는 개인정보 침해로 인한 분쟁 해결, 상담 등 피해 구제를 받고자 하는
        경우 아래의 기관에 신고·상담 등을 신청하실 수 있습니다.
      </p>
      <ol className={orderedListClassName}>
        <li>
          개인정보 분쟁조정위원회: (국번없이) 1833-6972 (
          <a
            href="https://www.kopico.go.kr/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            www.kopico.go.kr
          </a>
          )
        </li>
        <li>
          개인정보침해 신고센터: (국번없이) 118 (
          <a
            href="https://privacy.kisa.or.kr/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            privacy.kisa.or.kr
          </a>
          )
        </li>
        <li>
          경찰청: (국번없이) 182 (
          <a
            href="https://ecrm.police.go.kr/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            ecrm.police.go.kr
          </a>
          )
        </li>
      </ol>
    </div>
  );
};

  /* =========================================================
   * 이용약관 · 개인정보 처리방침
   * 기준: 개인정보 보호법 제30조, 개인정보 처리방침 작성지침(2025.4.21), 공정위 표준약관 구조
   * ======================================================= */
  // 공개되는 운영자 정보. 비어 있는 값은 문서에 '확인 중'으로 표시돼요.
  const LEGAL_INFO = {
    operator: '김주원',
    email: 'vocaproe2@gmail.com',
    dbRegion: '',
    effective: '2026년 10월 12일'
  };
  const lgv = v => v || '확인 중';
  function legalDocs() {
    const I = LEGAL_INFO, mail = lgv(I.email), region = lgv(I.dbRegion);
    return {
      privacy: ['개인정보 처리방침', `${I.operator}(이하 "운영자")은 VocaPro(이하 "서비스")를 운영하면서 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 빠르게 처리하기 위해 다음과 같이 개인정보 처리방침을 공개합니다.`, [
        ['제1조 개인정보의 처리 목적', `운영자는 다음 목적으로만 개인정보를 처리하며, 목적이 바뀌면 「개인정보 보호법」 제18조에 따라 별도 동의를 받는 등 필요한 조치를 합니다.
- 회원 가입과 관리: 회원 식별, 로그인 유지, 비밀번호 무차별 대입 같은 부정 이용 방지
- 학습 서비스 제공: 단어장·학습 기록·설정의 저장과 기기 간 동기화, 학년에 맞는 추천 단어 제공, 학교·이름을 넣은 시험지 등 학교 수업용 기능 제공
- AI 기능 제공: AI 단어 완성과 번역 요청 처리, 회원별 하루 사용 한도 관리
- 우리 반 기능 제공: 선생님의 반·과제 관리, 이용자가 참여한 반의 선생님에게 학습 현황과 과제 결과 제공
- 서비스 운영: 오류 확인과 대응`],
        ['제2조 처리하는 개인정보 항목', `회원 가입 시 필수 항목
- 아이디, 비밀번호, 학년(또는 선생님), 이름, 학교
회원 가입 시 선택 항목
- 학번(학생만)
- 비밀번호는 되돌릴 수 없는 방식(bcrypt)으로 바꿔 저장하며 원래 비밀번호는 저장하지 않습니다.
서비스 이용 중 만들어지는 정보
- 이용자가 입력한 단어장(단어, 뜻, 발음, 예문, 메모 등), 학습 기록과 통계, 앱 설정
- 로그인 세션 정보(토큰은 해시로 바꿔 저장), 가입·로그인 일시, 로그인 실패 횟수
- AI 기능의 날짜별 사용 횟수
- 우리 반을 쓰는 경우: 반 이름, 초대 코드, 과제(제목, 단어 목록, 마감일), 반에 참여할 때의 이름과 학번, 학습 요약(학습한 단어 수, 정답률, 연속 학습일, 많이 틀린 단어, 최근 시험 점수), 과제 결과(점수, 정답 수, 걸린 시간, 틀린 단어, 푼 횟수), 발음 평가 과제의 녹음(음성)과 AI·선생님 채점 결과, 앱이 열려 있는 동안의 접속 상태와 지금 하는 학습(학습 방법, 진행한 문제 수, 맞은·틀린 수, 마지막 접속 시각)
자동으로 생성되는 정보
- 서비스에 접속하는 과정에서 IP 주소, 브라우저 종류, 접속 일시가 호스팅·서버 업체의 접속 기록에 남을 수 있습니다.
수집하지 않는 정보
- 이메일, 전화번호, 주소, 위치 정보, 광고 식별자는 수집하지 않습니다.
- 이름, 학교, 학번은 화면 인사, 시험지 머리글 등 이용자 본인의 앱 안에서 씁니다. 이용자가 동의하고 반에 참여한 경우에만 그 반 선생님에게 이름과 학번을 보여 주며(제4조), 그 밖에는 다른 이용자에게 공개하거나 제3자에게 제공하지 않습니다. 설정 > 내 정보에서 언제든 고치거나 지울 수 있습니다(이름은 별명으로 바꿀 수 있습니다).`],
        ['제3조 개인정보의 처리 및 보유 기간', `- 계정 정보, 단어장, 학습 기록, 설정: 회원 탈퇴(계정 삭제) 시까지. 탈퇴하면 즉시 삭제합니다.
- 로그인 세션 정보: 로그인 후 90일 또는 로그아웃할 때까지
- AI 날짜별 사용 횟수: 30일
- 발음 평가 녹음(음성): 녹음한 날부터 60일이 지나면 녹음 파일을 자동으로 삭제합니다(점수는 아래 우리 반 정보와 같이 보관).
- 우리 반 정보: 학생이 반에서 나가거나 선생님이 내보내면 그 학생의 반 기록을, 선생님이 반이나 과제를 삭제하면 관련 기록을 즉시 삭제합니다. 회원 탈퇴 시에도 함께 삭제합니다.
- 접속 기록(IP 주소 등): 호스팅·서버 업체의 기록 보관 기간 동안. 운영자는 따로 보관하지 않습니다.
서비스는 무료이며 결제 기능이 없어, 법령에 따라 별도로 보관해야 하는 정보는 없습니다.`],
        ['제4조 개인정보의 제3자 제공', `운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자가 동의하거나 법률에 특별한 규정이 있는 경우(「개인정보 보호법」 제17조, 제18조)는 예외로 합니다.
이용자가 초대 코드로 반에 참여하면서 동의한 경우에는 다음과 같이 제공합니다.
- 받는 자: 이용자가 참여한 반을 만든 선생님(회원)
- 목적: 수업 중 학습 지도와 과제 확인
- 항목: 이름, 학번, 학습 요약(학습한 단어 수, 정답률, 연속 학습일, 많이 틀린 단어, 최근 시험 점수), 과제 결과(발음 평가 녹음과 점수 포함), 실시간 접속 상태와 지금 하는 학습
- 보유 기간: 이용자가 반에서 나가거나, 선생님이 내보내거나 반을 삭제할 때까지
- 동의를 거부할 수 있으며, 거부하면 반에 참여할 수 없을 뿐 다른 기능은 그대로 이용할 수 있습니다.`],
        ['제5조 개인정보 처리의 위탁', `운영자는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁합니다. 위탁 기간은 회원 탈퇴 또는 위탁 계약 종료 시까지입니다.
- Supabase, Inc.: 계정과 학습 데이터 저장, 서버 기능 실행 (서버 위치: ${region})
- Cloudflare, Inc.: 웹앱 배포와 호스팅 (미국)
- Google LLC: AI 단어 완성, 번역, 발음 평가 채점, 사진 속 글자 읽기 처리(Gemini API) (미국)
운영자는 「개인정보 보호법」 제26조에 따라 수탁자가 개인정보를 안전하게 처리하는지 관리합니다.`],
        ['제6조 개인정보의 국외 이전', `서비스 이용 과정에서 다음과 같이 개인정보가 국외로 이전됩니다. 모든 전송은 암호화된 통신(HTTPS)으로 이루어집니다.
- Google LLC (미국, https://policies.google.com/privacy): AI 완성·번역을 누를 때 입력한 영어·중국어 단어나 문장을, 발음 평가를 제출하거나 선생님이 다시 채점할 때 녹음(음성)과 읽을 단어·문장을, '글·사진에서 단어 뽑기'에서 사진 속 글자 읽기를 누를 때 고른 사진(줄인 JPEG)을, 문맥 뜻 채우기를 켜고 단어를 넣을 때 고른 단어와 글 속 문장을 보냅니다. 사진은 운영자 서버에 저장하지 않습니다. 아이디 등 계정 정보는 보내지 않습니다. 목적은 AI 결과 생성이며, 보유 기간은 Google의 Gemini API 약관을 따릅니다.
- Cloudflare, Inc. (미국, privacyquestions@cloudflare.com): 서비스에 접속할 때 IP 주소, 브라우저 정보가 전송됩니다. 목적은 웹앱 전송이며, 보유 기간은 Cloudflare의 기록 보관 기간을 따릅니다.
- Translated srl, MyMemory (이탈리아, https://mymemory.translated.net): AI 번역을 쓸 수 없을 때 번역할 문장을 보냅니다. 목적은 번역 결과 생성입니다.
- jsDelivr (Prospect One, 폴란드, https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net): 글꼴 파일을 받을 때 IP 주소가 전송됩니다.
- Supabase, Inc. (서버 위치: ${region}): 서버 위치가 국외인 경우 제2조의 계정·학습 정보가 그 국가에 저장됩니다.
이전을 원하지 않으면 AI 완성과 번역을 쓰지 않으면 됩니다. 내장 사전에 있는 단어는 외부로 보내지 않고 기기 안에서 채웁니다. 다만 접속 기록과 계정 정보 저장은 서비스 제공에 꼭 필요해 거부하면 서비스를 이용할 수 없습니다.
이용자가 설정에서 직접 입력한 AI 키로 이용하는 경우, 입력한 단어와 문장은 이용자 기기에서 해당 AI 제공자(Google, OpenAI, xAI, Anthropic)로 바로 전송되며 운영자 서버를 거치지 않습니다. 이 키는 이용자 기기에만 저장합니다.`],
        ['제7조 개인정보의 파기 절차 및 방법', `보유 기간이 끝나거나 처리 목적을 이루면 지체 없이 파기합니다.
- 회원 탈퇴: 설정의 "계정과 데이터 삭제"를 누르면 서버의 계정과 학습 데이터를 즉시 삭제하며 복구할 수 없습니다.
- 세션 정보와 AI 사용 횟수: 보유 기간이 지나면 자동으로 삭제합니다.
- 우리 반 정보: 반 나가기, 내보내기, 반·과제 삭제를 하면 즉시 삭제합니다.
- 전자 파일은 복구할 수 없는 방법으로 삭제하며, 종이 문서로는 개인정보를 보관하지 않습니다.
- 이용자 기기에 저장된 정보는 앱의 로그아웃·삭제 기능이나 브라우저의 사이트 데이터 삭제로 지울 수 있습니다.`],
        ['제8조 이용자와 법정대리인의 권리와 행사 방법', `이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지, 전송을 요구할 수 있습니다.
- 열람·전송: 설정의 "백업 파일 내려받기"(JSON)나 단어장 메뉴의 "CSV로 내보내기"로 직접 내려받을 수 있습니다.
- 정정: 앱에서 단어장과 설정을 직접 고칠 수 있습니다.
- 삭제·처리정지: 설정의 "계정과 데이터 삭제"로 바로 할 수 있습니다.
- 그 밖의 요구는 이메일(${mail})로 보내 주시면 10일 이내에 조치하고 결과를 알려 드립니다.
법정대리인이나 위임을 받은 사람을 통해서도 권리를 행사할 수 있으며, 이 경우 위임장을 함께 제출해야 합니다.`],
        ['제9조 자동 수집 장치의 설치·운영 및 거부', `서비스는 쿠키를 사용하지 않습니다. 로그인 상태, 설정, 학습 데이터를 이용자 기기의 브라우저 저장소(localStorage)에 저장하며, 이는 서비스 제공에 꼭 필요합니다. 브라우저 설정의 사이트 데이터 삭제로 지울 수 있으며, 이 경우 로그아웃되고 아직 동기화되지 않은 데이터가 지워질 수 있습니다.
광고, 행태정보 수집, 이용 분석 도구는 사용하지 않습니다.`],
        ['제10조 개인정보의 안전성 확보 조치', `- 비밀번호는 bcrypt로 단방향 암호화하고, 로그인 세션 토큰은 해시로 저장하며 90일 뒤 만료합니다.
- 모든 통신은 HTTPS로 암호화합니다.
- 데이터베이스 표에 대한 직접 접근을 막고(RLS), 정해진 서버 함수로만 처리합니다.
- 로그인을 5회 실패하면 10분간 잠그고, 가입과 반복 실패 시 보안문자를 확인합니다.
- 서버 비밀키는 서버에만 보관하고 앱 코드에 넣지 않습니다.
- 개인정보에 접근할 수 있는 사람을 운영자 1명으로 제한합니다.`],
        ['제11조 만 14세 미만 아동의 개인정보', `만 14세 미만 이용자는 서버 계정을 만들지 않고 "이 기기에만 저장" 방식으로 이용합니다. 이 경우 단어장과 학습 기록은 아동의 기기에만 저장되며 운영자는 아동의 개인정보를 수집하지 않습니다. 서버 동기화, 서버 AI 기능, 우리 반 기능은 제공하지 않으며, 내장 사전 등 나머지 학습 기능은 그대로 이용할 수 있습니다.`],
        ['제12조 자동화된 결정', 'AI 단어 완성은 이용자가 요청한 단어의 뜻과 예문을 채워 주는 기능이며, 이용자의 권리나 의무에 영향을 주는 자동화된 결정(「개인정보 보호법」 제37조의2)은 하지 않습니다. 이용자의 개인정보를 AI 학습에 쓰지 않습니다.'],
        ['제13조 개인정보 보호책임자', `개인정보 처리에 관한 업무와 고충 처리를 다음 책임자가 맡습니다.
- 성명: ${I.operator}
- 직책: 운영자(개발자)
- 이메일: ${mail}
1인 운영 서비스라 개인정보 열람 청구 접수와 처리도 같은 책임자가 맡습니다.`],
        ['제14조 권익침해 구제 방법', `개인정보 침해에 대한 상담이나 분쟁 해결은 아래 기관에 신청할 수 있습니다.
- 개인정보분쟁조정위원회: 국번 없이 1833-6972 (www.kopico.go.kr)
- 개인정보침해신고센터: 국번 없이 118 (privacy.kisa.or.kr)
- 대검찰청: 국번 없이 1301 (www.spo.go.kr)
- 경찰청: 국번 없이 182 (ecrm.police.go.kr)`],
        ['제15조 개인정보 처리방침의 변경', `이 방침을 바꿀 때는 시행 7일 전부터 앱 안에서 알리며, 이용자에게 불리하거나 중요한 변경은 30일 전부터 알립니다.
- 2026년 10월 11일: 제정
- 2026년 10월 11일: 법정 기재 항목 보완, 학년 정보·AI 기능·국외 이전 내용 반영
- ${I.effective}: 수집 항목에 이름, 학교, 학번(선택)과 선생님 가입 추가
- ${I.effective}: 우리 반 기능 추가(반에 참여할 때 동의를 받아 그 반 선생님에게 제공하는 정보, 보유 기간), 실시간 접속 상태 표시`],
        ['시행일', `이 방침은 ${I.effective}부터 시행합니다.`]]],
      terms: ['이용약관', '', [
        ['제1조 (목적)', `이 약관은 ${I.operator}(이하 "운영자")이 제공하는 영어·중국어 단어 학습 서비스 VocaPro(이하 "서비스")의 이용 조건과 절차, 운영자와 회원의 권리·의무를 정합니다.`],
        ['제2조 (정의)', `- 서비스: 운영자가 웹과 앱(PWA)으로 제공하는 VocaPro와 관련 기능
- 회원: 이 약관에 동의하고 계정을 만든 사람
- 학습 데이터: 회원이 만든 단어장, 학습 기록, 설정
- AI 기능: AI로 단어 정보를 채우거나 문장을 번역하는 기능`],
        ['제3조 (약관의 게시와 변경)', `- 운영자는 이 약관을 가입 화면과 설정 화면에서 언제든 볼 수 있게 합니다.
- 운영자는 관련 법령을 어기지 않는 범위에서 약관을 바꿀 수 있습니다. 바꿀 때는 적용일과 이유를 적어 적용일 7일 전부터 앱 안에서 알리며, 회원에게 불리한 변경은 30일 전부터 알립니다.
- 알린 적용일까지 거부 의사를 밝히지 않으면 바뀐 약관에 동의한 것으로 본다는 점을 함께 알렸는데도 회원이 거부하지 않으면 동의한 것으로 봅니다. 동의하지 않는 회원은 탈퇴할 수 있습니다.`],
        ['제4조 (회원 가입)', `- 아이디, 비밀번호, 학년(또는 선생님), 이름, 학교를 입력하고 이 약관과 개인정보 처리방침에 동의하면 가입됩니다.
- 만 14세 미만은 서버 계정을 만들 수 없으며 "이 기기에만 저장" 방식으로 이용합니다.
- 다른 사람의 정보를 도용하거나 서비스 운영을 방해할 목적으로 가입한 경우 가입을 거절하거나 취소할 수 있습니다.`],
        ['제5조 (계정 관리)', '회원은 아이디와 비밀번호를 스스로 관리해야 하며 다른 사람이 쓰게 해서는 안 됩니다. 서비스는 이메일 같은 복구 수단을 받지 않으므로 비밀번호를 잊으면 계정을 되찾을 수 없습니다. 도용을 알게 되면 바로 비밀번호를 바꾸고 운영자에게 알려 주세요.'],
        ['제6조 (서비스의 제공)', `서비스는 무료이며 다음 기능을 제공합니다.
- 단어장 관리, 반복 학습, 퀴즈, 듣기, 학습 통계
- 내장 사전, 학년별·수준별 추천 단어
- AI 단어 완성과 번역(회원별 하루 사용 한도 적용)
- 기기 간 동기화와 백업
- 우리 반: 반 만들기, 초대 코드로 참여, 과제 내기와 결과 제출, 학생별 학습 현황(서버 계정 회원만)`],
        ['제7조 (서비스의 변경과 중단)', '운영자는 운영상·기술상 필요하면 서비스 내용을 바꿀 수 있으며, 중요한 변경은 미리 알립니다. 설비 점검, 외부 서비스(호스팅, 데이터베이스, AI 제공자)의 장애, 천재지변 등으로 서비스가 일시 중단될 수 있습니다. 서비스를 끝낼 때는 30일 전에 알리고, 그 기간 동안 학습 데이터를 내려받을 수 있게 합니다.'],
        ['제8조 (AI 기능)', `- AI 결과는 자동으로 만들어진 것이라 틀릴 수 있으니 학습에 쓰기 전에 확인해 주세요.
- 하루 사용 한도를 넘으면 다음 날까지 서버 AI를 쓸 수 없습니다.
- AI 완성과 번역에 다른 사람의 개인정보나 민감한 내용을 입력하지 마세요. 입력한 내용은 개인정보 처리방침에 적힌 AI 제공자에게 전송됩니다.
- 회원이 직접 입력한 AI 키로 쓰는 경우 해당 AI 제공자의 약관이 적용되며, 그 사용 요금은 회원이 부담합니다.`],
        ['제9조 (운영자의 의무)', '운영자는 관련 법령과 이 약관을 지키며 서비스를 안정적으로 제공하기 위해 노력합니다. 회원의 개인정보는 개인정보 처리방침에 따라 보호하며, 회원의 의견과 불만은 이메일로 받아 빠르게 처리합니다.'],
        ['제10조 (회원의 의무)', `회원은 다음 행위를 해서는 안 됩니다.
- 다른 사람의 계정 도용이나 비밀번호 무차별 대입
- 프로그램 등을 이용한 과도한 자동 호출, AI 사용 한도 회피
- 서비스의 정상 운영을 방해하거나 서버에 부정하게 접근하는 행위
- 법령이나 공공질서에 어긋나는 내용을 저장·공유하는 행위
- 다른 사람인 척 반에 참여하거나, 반에서 본 다른 회원의 정보를 수업 밖으로 퍼뜨리는 행위`],
        ['제11조 (이용 제한)', '회원이 제10조를 어기면 운영자는 경고, 일시 정지, 계정 삭제 순으로 이용을 제한할 수 있습니다. 다만 서비스 운영에 심각한 피해를 주는 경우 바로 제한할 수 있습니다. 회원은 이용 제한에 대해 이메일로 이의를 제기할 수 있습니다.'],
        ['제12조 (회원 탈퇴)', '회원은 설정의 "계정과 데이터 삭제"로 언제든 탈퇴할 수 있습니다. 탈퇴하면 서버의 계정과 학습 데이터가 즉시 삭제되어 되돌릴 수 없으니, 필요하면 미리 백업 파일을 내려받아 두세요.'],
        ['제13조 (저작권)', '서비스의 디자인, 프로그램, 내장 사전과 추천 단어 목록의 권리는 운영자에게 있습니다. 회원이 만든 학습 데이터는 회원의 것이며, 운영자는 서비스 제공 목적 외에는 쓰지 않습니다.'],
        ['제14조 (책임의 제한)', '운영자는 천재지변, 외부 서비스 장애, 회원의 잘못으로 생긴 손해에는 책임을 지지 않습니다. 내장 사전과 AI 결과의 정확성, 학습 성과는 보장하지 않습니다. 다만 운영자의 고의나 중대한 과실로 생긴 손해는 관련 법령에 따라 책임을 집니다.'],
        ['제15조 (회원에 대한 통지)', '운영자는 앱 안 공지로 회원에게 알립니다. 서비스는 회원의 연락처를 받지 않으므로 개별 통지가 필요한 경우에도 앱 안 알림으로 합니다.'],
        ['제16조 (분쟁 해결과 준거법)', `서비스 이용과 관련한 분쟁은 먼저 이메일(${mail})로 협의해 해결합니다. 협의가 되지 않으면 대한민국 법을 적용하며, 관할 법원은 「민사소송법」에 따라 정합니다.`],
        ['부칙', `이 약관은 ${I.effective}부터 시행합니다.`]]]
    };
  }
  function legalHtml(t) {
    let out = '', list = '';
    const flush = () => { if (list) { out += `<ul>${list}</ul>`; list = ''; } };
    String(t).split('\n').forEach(l => {
      if (l.startsWith('- ')) list += `<li>${esc(l.slice(2))}</li>`;
      else { flush(); if (l.trim()) out += `<p>${esc(l)}</p>`; }
    });
    flush(); return out;
  }
  ACTIONS.legal = el => {
    const d = legalDocs()[el.dataset.k]; if (!d || $('lgOv')) return;
    const ov = document.createElement('div'); ov.className = 'ob lt lg'; ov.id = 'lgOv'; ov.style.zIndex = 700;
    ov.innerHTML = `<button class="ob-skip" data-lg="x">닫기</button><div class="lg-body"><h2>${d[0]}</h2>${d[1] ? legalHtml(d[1]) : ''}${d[2].map(([h, t]) => `<h4>${esc(h)}</h4>${legalHtml(t)}`).join('')}</div>`;
    ov.addEventListener('click', e => { if (e.target.closest('[data-lg]')) ov.remove(); });
    document.body.appendChild(ov);
  };
  function legalLinksHtml() { return '<div class="legal-links"><a class="lg-a" data-act="legal" data-k="terms">이용약관</a> · <a class="lg-a" data-act="legal" data-k="privacy">개인정보 처리방침</a></div>'; }


  function flowEntryHtml() { return `<button class="mg-entry" data-act="flow"><span class="mg-ico">${IC.repeat}</span><span class="mg-txt"><b>4단계 집중 학습</b><small>보기, 고르기, 쓰기, 시험으로 확실하게</small></span><span class="mg-chev"></span></button>`; }

  /* =========================================================
   * 키보드 단축키 (PC)
   * ======================================================= */
  const KBD = {
    card: [['Space', '뒤집기'], ['←', '몰라요'], ['→', '알아요'], ['Esc', '나가기']],
    choice: [['1~4', '고르기'], ['Esc', '나가기']],
    spell: [['Enter', '확인 · 다음'], ['Esc', '나가기']],
    listen: [['Space', '재생 · 정지'], ['← →', '이전 · 다음'], ['Esc', '나가기']]
  };
  KBD.lchoice = KBD.choice; KBD.mix = [['1~4', '고르기'], ['Enter', '확인 · 다음'], ['Esc', '나가기']]; KBD.scramble = [['Esc', '나가기']];
  KBD.rchoice = KBD.choice; KBD.dict = KBD.spell; KBD.test = [['1~4', '고르기'], ['Enter', '제출'], ['Esc', '나가기']]; KBD.cloze = KBD.choice;
  function kbdHint(mode) { const el = $('kbdHint'); if (el) el.innerHTML = (KBD[mode] || []).map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join(''); }
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (document.querySelector('.dlg-ov')) return;
    const t = e.target, tag = t && t.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(t && t.isContentEditable);
    const sheetOpen = $('sheetOv').classList.contains('open');
    const study = $('studyScreen').classList.contains('open') && !sheetOpen && !$('flOv') && !$('ltOv') && !$('mgOv');
    if (e.key === 'Escape') {
      if ($('trOv')) return;
      const lg = $('lgOv'); if (lg) { e.preventDefault(); lg.remove(); return; }
      if ($('authScreen').style.display !== 'none' || $('obOv')) return;
      for (const [id, sel] of [['flOv', '[data-fl="close"]'], ['ltOv', '[data-lt="close"]'], ['mgOv', '[data-mg="x"]']]) {
        const ov = $(id); if (!ov) continue;
        const b = ov.querySelector(sel); if (b) { e.preventDefault(); b.click(); }
        return;
      }
      if (sheetOpen) { e.preventDefault(); closeSheet(); return; }
      if (study) { e.preventDefault(); ACTIONS['exit-session'](); }
      return;
    }
    if (typing || $('trOv') || $('lgOv')) return;
    if (/^[1-4]$/.test(e.key)) {
      const scope = $('flOv') || $('ltOv') || (study ? $('stBody') : null);
      const b = scope && scope.querySelectorAll('.opt')[+e.key - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (!study || !S.active || S.finished) return;
    if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    if (S.mode === 'card') {
      if (e.key === ' ') { e.preventDefault(); const f = $('fc3d'); if (f && !S.locked) f.classList.toggle('is-flipped'); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); flyCard(e.key === 'ArrowRight' ? 1 : -1); }
    } else if (S.mode === 'listen') {
      if (e.key === ' ') { e.preventDefault(); ACTIONS['l-toggle'](); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ACTIONS['l-prev'](); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); ACTIONS['l-next'](); }
    }
  });

  /* =========================================================
   * 시작
   * ======================================================= */
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  /* 예전 주소(hijujuwon.kro.kr)로 들어오면 새 주소 안내. 기기에만 저장한 데이터는 주소마다 따로라 바로 넘기지 않고 백업 방법을 알려 줘요. */
  const NEW_HOST = 'vocapro.kro.kr';
  // 새 주소 DNS가 아직 연결되지 않아(NXDOMAIN) 안내를 잠시 꺼 둬요. vocapro.kro.kr 이 열리면 true 로 바꾸세요.
  const MOVE_READY = false;
  if (MOVE_READY && location.hostname === 'hijujuwon.kro.kr') {
    const bar = document.createElement('div'); bar.className = 'move-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<div><b>주소가 ${NEW_HOST} 로 바뀌었어요</b><small>서버 계정은 새 주소에서 같은 아이디로 로그인하면 그대로예요. 이 기기에만 저장한 계정은 설정 > 백업 파일 내려받기를 한 뒤 새 주소에서 불러오세요.</small></div><a class="btn btn-primary btn-sm" href="https://${NEW_HOST}/">새 주소로 가기</a><button class="move-x" aria-label="닫기">${IC.x}</button>`;
    bar.querySelector('.move-x').addEventListener('click', () => bar.remove());
    document.body.appendChild(bar);
  }
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  ACTIONS.install = async () => {
    if (!deferredInstall) return say('브라우저 메뉴에서 "홈 화면에 추가"를 눌러 설치할 수 있어요.\n아이폰은 공유 버튼, 홈 화면에 추가예요.');
    deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null;
  };
  let lastErrAt = 0;
  const softErr = () => { if (Date.now() - lastErrAt > 4000) { lastErrAt = Date.now(); try { toast('일시적인 문제가 생겼어요. 계속 반복되면 새로고침해 주세요.'); } catch (e) {} } };
  window.addEventListener('error', e => { if (e && e.message && !/ResizeObserver/.test(e.message)) softErr(); });
  window.addEventListener('unhandledrejection', e => { e.preventDefault && e.preventDefault(); softErr(); });
  applyTheme();
  let sess = null;
  try { sess = LS.getItem(KEY_SESS) || sessionStorage.getItem(KEY_SESS); } catch (e) {}
  let kidBoot = false; try { kidBoot = cloudAvail && LS.getItem(KEY_KID) === '1'; } catch (e) {}
  if (kidBoot && sess && getUsers()[sess]) { setKidMode(true); enterApp(sess); }
  else if (cloudMode) bootCloud(); else if (sess && getUsers()[sess]) enterApp(sess); else showAuth();

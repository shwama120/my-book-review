// 1. 필요한 외부 패키지(모듈) 로드
const express = require('express');          // 웹 서버 구축을 위한 Express 프레임워크 로드
const mongoose = require('mongoose');        // MongoDB 데이터를 관리하기 위한 객체 모델링 라이브러리(Mongoose) 로드
const bodyParser = require('body-parser');    // HTTP 요청 본문(req.body)의 데이터를 파싱하기 위한 미들웨어 로드
const methodOverride = require('method-override'); // HTML Form 태그에서 지원하지 않는 PUT/DELETE 메서드를 사용할 수 있게 해주는 모듈 로드

// 2. 서버 및 데이터베이스 환경 설정
const app = express();                       // Express 애플리케이션 객체 생성
const PORT = process.env.PORT || 3000;       // 배포 환경의 포트 번호를 사용하거나, 없을 경우 3000번 포트 지정
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/booklog'; // 접속할 MongoDB 데이터베이스 주소 설정

// 3. MongoDB 데이터베이스 연결 설정
mongoose.connect(MONGO_URI)                  // 정의된 DB 주소로 연결 시도 (Promise 패턴 사용)
  .then(() => console.log('MongoDB 연결 성공!')) // 연결 성공 시 콘솔에 완료 메시지 출력
  .catch(err => console.error('MongoDB 연결 실패:', err)); // 연결 실패 시 에러 내용 출력

// 4. Mongoose 스키마 정의 (데이터 구조/필드 설계)
const LogSchema = new mongoose.Schema({
  title: { type: String, required: true },      // 도서 제목: 문자열 타입, 필수 입력 데이터
  author: { type: String, required: true },     // 저자 이름: 문자열 타입, 필수 입력 데이터
  category: { type: String, default: '도서' },   // 분류: 문자열 타입, 값을 입력하지 않으면 기본값 '도서' 지정
  page_count: String,                           // 페이지 수: 문자열 타입
  review: String,                               // 감상평/리뷰 내용: 문자열 타입
  created_at: { type: Date, default: Date.now } // 데이터 작성 시간: 날짜 타입, 기본값은 현재 서버 시간
});

// 5. 스키마를 기반으로 한 DB 작업용 모델(Model) 생성
const Log = mongoose.model('Log', LogSchema);   // 'Log' 모델 생성 (실제 DB에는 'logs'라는 복수형 컬렉션이 생성됨)

// 6. Express 애플리케이션 미들웨어 및 뷰 엔진 설정
app.set('view engine', 'ejs');                  // HTML 화면을 동적으로 생성할 템플릿 엔진으로 EJS 설정
app.use(bodyParser.urlencoded({ extended: true })); // HTML Form 태그의 URL-encoded 데이터를 서버에서 req.body로 읽을 수 있도록 설정
app.use(methodOverride('_method'));             // 쿼리 스트링(?_method=PUT 등)을 인식해 HTTP 메서드를 가로채는 미들웨어 적용
app.use(express.static('public'));              // CSS, 이미지 등 정적 파일을 보관하는 폴더를 'public'으로 지정

// ---------------------------------------------------------
// [기능 라우터 (API 및 웹 페이지 경로 정의)]
// ---------------------------------------------------------

// 1. 목록 조회 API (JSON 형식 데이터 응답)
app.get('/api/logs', async (req, res) => {
  // DB의 모든 로그를 조회하고, 최신순(created_at 기준 내림차순: -1)으로 정렬하여 변수에 저장
  const logs = await Log.find().sort({ created_at: -1 });
  res.json(logs); // 조회한 데이터를 JSON 포맷으로 클라이언트에 전송
});

// 2. 상세 페이지 조회 (EJS 템플릿 렌더링)
app.get('/log/:id', async (req, res) => {
  try {
    // 주소창으로 전달받은 아이디(req.params.id)값으로 DB에서 특정 데이터 검색
    const log = await Log.findById(req.params.id);
    // 날짜 데이터를 'YYYY-MM-DD' 형식의 문자열로 가공 (예: "2026-06-19T07:04:00..." -> "2026-06-19")
    const formattedDate = log.created_at.toISOString().split('T')[0];
    // 'detail.ejs' 파일을 불러와 데이터(item)와 포맷팅된 날짜(date)를 채워서 화면 표시
    res.render('detail', { item: log, date: formattedDate });
  } catch (err) {
    // 해당하는 ID 데이터를 찾지 못하거나 오류 발생 시 404 상태 코드와 에러 메시지 전송
    res.status(404).send("로그를 찾을 수 없습니다.");
  }
});

// 3. 새로운 리뷰 등록 기능 (POST)
app.post('/api/logs', async (req, res) => {
  try {
    // 클라이언트가 보낸 폼 데이터(req.body)를 활용해 새로운 Log 객체를 만들고 DB에 저장
    await new Log(req.body).save();
    res.redirect('/'); // 저장이 끝나면 서버가 브라우저에게 메인 화면('/')으로 이동하라고 명령(리다이렉트)
  } catch (err) {
    // 서버 오류 발생 시 500 상태 코드와 실패 메시지 전송
    res.status(500).send("저장 실패");
  }
});

// 4. 수정 페이지 진입 (EJS 템플릿 렌더링)
app.get('/edit/:id', async (req, res) => {
  try {
    // 주소창의 ID(req.params.id)값을 사용해 기존에 작성했던 데이터 확인 차 조회
    const log = await Log.findById(req.params.id);
    // 'edit.ejs' 템플릿 파일에 조회한 기존 데이터(item)를 전달하여 수정 폼 화면 생성
    res.render('edit', { item: log });
  } catch (err) {
    // 데이터를 찾지 못하면 404 상태 코드와 메시지 전송
    res.status(404).send("수정할 데이터를 찾을 수 없습니다.");
  }
});

// 5. 수정 사항 반영 기능 (PUT 메서드)
app.put('/api/logs/:id', async (req, res) => {
  try {
    // URL로 전달받은 ID 데이터의 내용을 사용자가 새로 입력하여 보낸 데이터(req.body)로 업데이트 수행
    await Log.findByIdAndUpdate(req.params.id, req.body);
    // 수정이 완료되면 방금 수정한 데이터의 상세 페이지(`/log/데이터ID`)로 리다이렉트 이동
    res.redirect(`/log/${req.params.id}`);
  } catch (err) {
    // 서버 내부 수정 오류 시 500 상태 코드와 실패 메시지 전송
    res.status(500).send("수정 실패");
  }
});

// 6. 삭제 기능 (DELETE 메서드)
app.delete('/api/logs/:id', async (req, res) => {
  try {
    // 주소창의 ID(req.params.id)값을 기반으로 해당 데이터를 DB에서 찾아서 즉시 삭제
    await Log.findByIdAndDelete(req.params.id);
    res.redirect('/'); // 삭제 처리가 끝나면 메인 화면('/')으로 리다이렉트 이동
  } catch (err) {
    // 서버 내부 삭제 오류 시 500 상태 코드와 실패 메시지 전송
    res.status(500).send("삭제 실패");
  }
});

// 7. 웹 서버 구동
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // 지정한 포트(3000번 등)를 열고 클라이언트 요청 대기 시작

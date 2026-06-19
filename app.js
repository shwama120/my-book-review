const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// 서버가 구동될 포트 번호를 설정합니다. (Render 배포 환경 포트 또는 기본 3000번)
const PORT = process.env.PORT || 3000;

// [보안 및 로컬 테스트 호환] 환경변수가 없을 경우 로컬 DB에 연결되도록 안전장치를 추가했습니다.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/booklog';

// MongoDB 클라우드 데이터베이스에 연결합니다.
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB 연결 성공!'))
  .catch(err => console.error('MongoDB 연결 실패:', err));

// [항목 수정] 보내주신 UI 이미지에 있던 '쪽수(page_count)' 항목을 스키마에 추가했습니다.
const LogSchema = new mongoose.Schema({
  title: { type: String, required: true }, // 제목 (텍스트, 필수)
  author: { type: String, required: true }, // 작가 (텍스트, 필수)
  category: { type: String, default: '도서' }, // 카테고리 (도서/웹툰)
  page_count: String,  // 쪽수 (텍스트 또는 숫자)
  review: String,      // 감상평 및 서평 본문 (텍스트)
  created_at: { type: Date, default: Date.now } // 생성일자 (기본값: 현재시간)
});

// 정의한 스키마를 바탕으로 데이터베이스 작업을 할 수 있는 'Review' 모델을 생성합니다.
const Log = mongoose.model('Log', LogSchema);

// HTML 폼(Form) 전송 방식으로 들어오는 데이터를 해석하는 미들웨어입니다.
app.use(bodyParser.urlencoded({ extended: true })); // 최신 Express 규격에 맞게 true로 변경

// HTML, CSS, JavaScript 같은 정적 파일들이 모여있는 'public' 폴더를 외부에 개방합니다.
app.use(express.static('public'));

// -------------------------------------------------------------------------
// [API 라우터 영역]
// -------------------------------------------------------------------------

// 1. [GET] 전체 리뷰 목록 조회 API
app.get('/api/logs', async (req, res) => {
  try {
    // DB에서 모든 로그를 조회하고, 최신순(_id 또는 created_at 역순)으로 정렬합니다.
    const logs = await Log.find().sort({ created_at: -1 });
    // 조회한 로그 데이터를 JSON 형식으로 프론트엔드에 응답합니다.
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "데이터 조회 중 오류가 발생했습니다." });
  }
});

// 2. [GET] 특정 리뷰 상세 조회 API (상세 보기를 위해 추가된 필수 라우터)
app.get('/api/logs/:id', async (req, res) => {
  try {
    const logId = req.params.id;
    // 몽고DB의 고유 _id 값을 기준으로 딱 하나의 데이터만 조회합니다.
    const log = await Log.findById(logId);
    
    if (log) {
      res.json(log);
    } else {
      res.status(404).json({ error: "해당 로그를 찾을 수 없습니다." });
    }
  } catch (err) {
    res.status(400).json({ error: "올바르지 않은 ID 요청입니다." });
  }
});

// 3. [POST] 새 리뷰 데이터 등록 API
app.post('/api/logs', async (req, res) => {
  try {
    const { title, author, category, page_count, review } = req.body;
    
    // 구조 분해 할당을 통해 안전하게 데이터를 추출하여 DB에 저장합니다.
    await new Log({ title, author, category, page_count, review }).save();
    
    // 저장이 끝나면 메인 페이지('/')로 리다이렉트 시켜 화면을 새로고침합니다.
    res.redirect('/');
  } catch (err) {
    res.status(500).send("<script>alert('저장 실패: 필수 항목을 확인하세요.'); history.back();</script>");
  }
});

// 설정한 포트 번호로 서버를 구동하고 클라이언트의 접속을 대기합니다.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

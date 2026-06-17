const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// 서버가 구동될 포트 번호를 설정합니다. (배포 환경의 포트 또는 기본 3000번)
const PORT = process.env.PORT || 3000;

// MongoDB 클라우드 데이터베이스에 연결합니다. (보안을 위해 URI는 환경변수 처리)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB 연결 성공!'))
  .catch(err => console.error('MongoDB 연결 실패:', err));

// MongoDB에 저장할 리뷰 데이터의 명세서(구조 및 타입)를 정의합니다.
const ReviewSchema = new mongoose.Schema({
  title: String,       // 제목 (텍스트)
  author: String,      // 작가 (텍스트)
  category: String,    // 카테고리 (도서/웹툰 등)
  rating: Number,      // 평점 (숫자)
  review: String,      // 한 줄 평 (텍스트)
  created_at: { type: Date, default: Date.now } // 생성일자 (기본값: 현재시간)
});

// 정의한 스키마를 바탕으로 데이터베이스 작업을 할 수 있는 'Review' 모델을 생성합니다.
const Review = mongoose.model('Review', ReviewSchema);

// HTML 폼(Form) 전송 방식으로 들어오는 데이터(x-www-form-urlencoded)를 해석하는 미들웨어입니다.
app.use(bodyParser.urlencoded({ extended: false }));

// HTML, CSS, JavaScript 같은 정적 파일들이 모여있는 'public' 폴더를 외부에 개방합니다.
app.use(express.static('public'));

// [GET] 프론트엔드의 fetch('/api/reviews') 요청 시, 전체 리뷰 목록을 전달합니다.
app.get('/api/reviews', async (req, res) => {
  // DB에서 모든 리뷰를 조회하고, 최신순(created_at 역순)으로 정렬합니다.
  const reviews = await Review.find().sort({ created_at: -1 });
  // 조회한 리뷰 데이터를 JSON 형식으로 프론트엔드에 응답합니다.
  res.json(reviews);
});

// [POST] 프론트엔드 폼 태그의 데이터 등록 버튼을 눌렀을 때 실행됩니다.
app.post('/api/reviews', async (req, res) => {
  // 폼에 입력되어 전송된 데이터(req.body)를 그대로 활용해 새로운 리뷰 객체를 만들고 DB에 저장합니다.
  await new Review(req.body).save();
  // 저장이 끝나면 사용자의 화면을 메인 페이지('/')로 다시 돌려보냅니다(새로고침 효과).
  res.redirect('/');
});

// 설정한 포트 번호로 서버를 구동하고 클라이언트의 접속을 대기합니다.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

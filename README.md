# 🌿 Farm-me Fatal

> **초보자를 위한 실패 방지형 홈 가드닝 시뮬레이션 플랫폼**  
> 베란다·옥상에서 식물을 키우다 포기한 경험, 이제 Farm-me Fatal이 해결합니다.

<br>

## 📌 프로젝트 소개

Farm-me Fatal은 MQTT 기반 가상 센서와 공공 기상 API를 활용한 **스마트팜 시뮬레이션 웹 플랫폼**입니다.  
고가의 하드웨어 없이도 실내·실외 식물 환경을 실시간으로 모니터링하고, AI 기반 리포트와 병해충 예측 알림을 통해 초보 홈 가드너의 식물 관리 실패를 방지합니다.

| 구분 | 내용 |
|------|------|
| 팀명 | 루트노드 (Root Node) |
| 서비스명 | Farm-me Fatal |
| 개발 기간 | 2026.03 ~ 2026.06 |
| 소속 | 아주대학교 캡스톤디자인 (미디어프로젝트) |

<br>

## 🎯 핵심 문제 정의

```
베란다에서 식물을 키우다 포기하는 이유
  🐛 벌레·진드기 — 아무도 해결 못 해서 포기
  💧 물주기 타이밍 — 언제 줘야 할지 모름
  🌡️ 온습도 관리 — 환경 변화에 대응 어려움
  ☀️ 채광 부족 — 실내에서 빛이 부족한지 모름
```

<br>

## 🛠️ 기술 스택

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=flat-square&logo=mqtt&logoColor=white)

### AI / ML
![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)
![ResNet](https://img.shields.io/badge/ResNet18-Classification-orange?style=flat-square)

### External API
![OpenWeather](https://img.shields.io/badge/OpenWeather_API-EB6E4B?style=flat-square)
![농사로](https://img.shields.io/badge/농촌진흥청_API-2E7D32?style=flat-square)
![AI Hub](https://img.shields.io/badge/AI_Hub-식물질병_데이터셋-blue?style=flat-square)

### Auth
![Supabase](https://img.shields.io/badge/Supabase_Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Google](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat-square&logo=google&logoColor=white)
![Kakao](https://img.shields.io/badge/Kakao_OAuth-FFCD00?style=flat-square&logo=kakao&logoColor=black)

### Infra
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)

<br>

## 🏗️ 시스템 아키텍처

```
[Supabase Auth]          [OpenWeather API]     [농사로 API]
 이메일/구글/카카오             ↓                    ↓
       ↓              [Weather Scheduler]  [Plant DB 동기화]
       ↓                      ↓
[가상 센서 / 실제 센서]
       ↓ MQTT Publish
[Mosquitto Broker]
       ↓ Subscribe
[Node.js Backend]
  ├── 인증 미들웨어 (JWT)
  ├── 센서 데이터 저장 (Supabase PostgreSQL)
  ├── 룰엔진 실행 (관수·환기·LED·병해충)
  ├── Gemini AI 리포트 생성
  ├── REST API 제공
  └── 질병 분석 요청 ──────────────────────→ [Python AI 서버]
                                                     ↓
                                           [ResNet18 Classification]
                                           (AI Hub 식물 질병 데이터셋)
       ↓
[React Frontend]
  실시간 대시보드 / 식물 추천 / AI 리포트 / 질병 분석
```

> 🔗 AI 서버 레포지토리: [python-smartfarm-ai-server](https://github.com/juunghaa/python-smartfarm-ai-server)

<br>

## ✨ 주요 기능

### 1. 🔐 사용자 인증
Supabase Auth 기반 멀티 소셜 로그인을 지원합니다.
- 이메일/비밀번호 회원가입·로그인
- Google OAuth 로그인
- Kakao OAuth 로그인
- JWT 기반 API 인증 미들웨어

### 2. 🌱 식물 추천
사용자 환경(채광, 물주기 빈도, 벌레 민감도)을 입력받아 적합한 식물을 추천합니다.
- 농촌진흥청 공공데이터 기반 식물 DB
- Gemini AI 맞춤 추천 이유 생성
- 추천 식물 즉시 등록 기능

**지원 식물 5종**

| 식물 | 환경 | 난이도 |
|------|------|--------|
| 산세베리아 | 실내 | 쉬움 |
| 몬스테라 | 실내 | 보통 |
| 방울토마토 | 실외 | 보통 |
| 상추 | 실외 | 쉬움 |
| 파 | 실외 | 쉬움 |

### 3. 💧 자동 관수 룰엔진
식물별 최적 환경 기준으로 자동 제어합니다.

| 룰 | 조건 | 동작 |
|----|------|------|
| 자동 관수 | 토양 수분 < 임계값 | 펌프 ON (히스테리시스) |
| 환기 알림 | 습도 > 임계값 | 창문 OPEN |
| LED 제어 | 태양 고도 < 기준 (SunCalc) | LED ON |
| 병해충 경보 | 온도·습도 조건 동시 초과 | 알림 저장 |
| 비 예보 스킵 | 강수 확률 ≥ 50% (실외) | 관수 건너뜀 |
| 저온 경보 | 온도 < 최솟값 | 창문 CLOSE + 알림 |

### 4. 🔬 식물 질병 분석 (AI Classification)
식물 잎사귀 사진을 업로드하면 질병 여부를 자동으로 분석합니다.

- **데이터셋**: AI Hub 식물 병충해 이미지 데이터 ([147번](https://aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100&aihubDataSe=data&dataSetSn=147))
- **모델**: ResNet18 전이학습 기반 Binary Classification (`healthy` / `disease`)
- **학습 환경**: Google Colab (GPU)
- **서빙**: 별도 Python AI 서버로 배포 후 백엔드와 REST 통신
- **결과**: 질병 여부 + 신뢰도(confidence) 반환

```
사용자 사진 업로드
      ↓
Node.js Backend (POST /api/disease/analyze)
      ↓ 이미지 전달
Python AI Server (ResNet18 추론)
      ↓ { label, confidence }
Node.js Backend → DB 저장 → 프론트 반환
```

### 5. 📋 Gemini AI 일일 리포트
매일 오후 8시, 하루 센서 데이터를 분석해 카카오톡 스타일의 친근한 리포트를 생성합니다.
- 평균 온도·습도·토양 수분 집계
- 오늘 발생한 알림 요약
- 관수 횟수 및 내일 관리 팁

### 6. 🌤️ 외부 기상 연동
OpenWeather API를 10분마다 수집하여 실외 온실의 비 예보·기상 조건을 룰엔진에 반영합니다.
- 위도·경도 기반 온실별 날씨 조회
- SunCalc 라이브러리로 태양 고도 실시간 계산

<br>

## 📡 API 명세

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 이메일 회원가입 |
| POST | `/api/auth/login` | 이메일 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 |

> Google·Kakao OAuth는 Supabase Auth UI 통해 처리

### 온실 설정
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/greenhouse` | 온실 설정 조회 |
| POST | `/api/greenhouse` | 온실 설정 등록·수정 |

### 센서·장치 데이터
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/latest` | 최신 센서 데이터 1건 |
| GET | `/api/history` | 시계열 센서 이력 (차트용) |
| GET | `/api/actuators` | 제어 이벤트 로그 |
| GET | `/api/weather` | 최신 외부 기상 데이터 |
| GET | `/api/alerts` | 룰엔진 알림 로그 |

### 제어
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/control` | 수동 제어 (펌프·LED·창문) |

### 식물
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/plant/recommend` | 식물 추천 |
| POST | `/api/plant/register` | 식물 등록 |
| GET | `/api/plant/list` | 식물 목록 |

### 리포트
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/reports` | 일일 리포트 히스토리 |
| GET | `/api/reports/today` | 오늘 리포트 |
| POST | `/api/reports/generate` | 리포트 즉시 생성 (테스트용) |

### 질병 분석
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/disease/analyze` | 식물 사진 업로드 → 질병 분석 |
| GET | `/api/disease/history` | 분석 이력 조회 |

> 모든 엔드포인트는 `Authorization: Bearer {token}` 헤더 필요  
> 온실 관련 엔드포인트는 `greenhouseId` 파라미터 필수

<br>

## 🗃️ DB 테이블 구조

```
greenhouses       온실 설정 (식물 종류, 위치, 좌표, user_id)
sensor_readings   센서 데이터 (온도, 습도, 토양수분, 조도)
actuator_logs     제어 이벤트 로그 (관수, 환기, LED)
weather_logs      외부 기상 데이터 (10분 주기)
alert_logs        룰엔진 알림 로그
daily_reports     Gemini AI 일일 리포트
plants            식물 정보 DB (농사로 API 연동)
user_plants       사용자 등록 식물
disease_logs      질병 분석 이력 (ResNet18 결과)
```

<br>

## 📁 프로젝트 구조

```
smartfarm-backend/
├── server.js                   # 진입점
├── src/
│   ├── app.js                  # Express 설정, 라우터 등록
│   ├── config/
│   │   └── index.js            # 환경변수
│   ├── db/
│   │   └── pool.js             # PostgreSQL 연결 풀
│   ├── middlewares/            # 인증 미들웨어 (JWT)
│   ├── routes/                 # API 라우터
│   │   ├── auth.js
│   │   ├── apiRoutes.js
│   │   ├── control.js
│   │   ├── weather.js
│   │   ├── greenhouse.js
│   │   ├── alert.js
│   │   ├── plant.js
│   │   ├── report.js
│   │   └── disease.js
│   ├── controllers/            # 요청 처리
│   ├── services/               # 비즈니스 로직
│   │   ├── authService.js      # Supabase Auth 연동
│   │   ├── mqttService.js      # MQTT 연결·수신·발행
│   │   ├── ruleEngine.js       # 자동 제어 룰 (식물 5종)
│   │   ├── weatherService.js   # OpenWeather 스케줄러
│   │   ├── reportService.js    # Gemini 리포트 생성
│   │   ├── plantService.js     # 식물 추천·농사로 연동
│   │   ├── diseaseService.js   # AI 서버 통신·질병 분석
│   │   └── aiService.js        # Gemini API 공통 호출
│   └── utils/
│       └── requestUtils.js     # 공통 요청 유틸
└── publisher.js                # 가상 센서 (테스트용)
```

<br>

## 🤖 AI 서버 (별도 레포)

> 🔗 [python-smartfarm-ai-server](https://github.com/juunghaa/python-smartfarm-ai-server)

| 항목 | 내용 |
|------|------|
| 프레임워크 | FastAPI |
| 모델 | ResNet18 (PyTorch 전이학습) |
| 데이터셋 | AI Hub 식물 병충해 이미지 ([147번](https://aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100&aihubDataSe=data&dataSetSn=147)) |
| 분류 | healthy / disease (Binary Classification) |
| 학습 환경 | Google Colab (GPU) |
| 배포 | Render |

<br>

## ⚙️ 환경변수 설정

```env
# Server
PORT=3000

# Database (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase Auth
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MQTT
MQTT_URL=mqtt://localhost:1883
SENSOR_TOPIC=farm/+/sensor
PUMP_TOPIC=farm/+/actuator/pump
ENABLE_MQTT=true

# External API
OPENWEATHER_API_KEY=your_key
OPENWEATHER_LAT=37.5665
OPENWEATHER_LON=126.9780
GEMINI_API_KEY=your_key
NONGSARO_API_KEY=your_key

# AI Server
AI_SERVER_URL=https://python-smartfarm-ai-server.onrender.com
```

<br>

## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 키 값 입력

# 3. Mosquitto 브로커 실행
mosquitto

# 4. 서버 실행
node server.js

# 5. 가상 센서 실행 (별도 터미널)
node publisher.js
```

<br>

## 👥 팀원

| 이름 | 학과 | 역할 |
|------|------|------|
| 김효정 | 디지털미디어학과 | Frontend |
| 김정하 | 소프트웨어학과 | Backend · AI |

**지도교수**: 고욱 교수님 (디지털미디어학과)  
**자문**: 제민욱 (PROJECT PLUTO)

<br>

## 📄 라이선스

This project is licensed under the MIT License.

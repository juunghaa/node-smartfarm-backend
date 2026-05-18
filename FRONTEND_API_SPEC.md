# SmartFarm 백엔드 API 명세서 (Frontend 전달용)

최종 수정일: 2026-05-18

## 1) 공통

### Base URL
- 로컬: `http://localhost:3000`
- 배포: `https://<render-url>`

### 공통 응답
- 성공: `200` + JSON
- 생성 성공: `201` + JSON
- 검증 오류: `400` + `{ "error": "..." }`
- 인증 오류: `401` + `{ "ok": false, "error": "..." }`
- 권한 오류: `403` + `{ "ok": false, "error": "..." }`
- 서버 오류: `500` + `{ "error": "..." }`
- 요청 제한(식물 추천): `429` + `{ "error": "추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }`

### 인증 방식 (Hybrid: Supabase + Kakao Custom OAuth)
- Google/Email 로그인: Supabase Auth를 사용합니다.
- Kakao 로그인: 백엔드 커스텀 OAuth(`/api/auth/kakao/*`)를 사용합니다.
- 백엔드 API 호출 시 아래 토큰 중 하나를 헤더에 포함합니다.
  - Supabase Access Token
  - Kakao 커스텀 OAuth로 발급된 백엔드 JWT
- 헤더: `Authorization: Bearer <ACCESS_TOKEN>`

### greenhouseId 정책
- 온실 단위 API는 `greenhouseId`가 필수입니다.
- 기본값 `gh1` 폴백은 제거되었습니다.
- 하위 호환으로 `greenhouseID`도 허용하지만 `greenhouseId` 사용을 권장합니다.

### 사용자별 온실 소유권
- 대부분의 온실 단위 API는 토큰 사용자(`auth.uid`)와 온실 소유자(`greenhouses.user_id`) 일치 여부를 검사합니다.
- 다른 사용자의 온실에 접근하면 `403`을 반환합니다.

---

## 2) 인증 (Auth)

### POST `/api/auth/signup`
- Deprecated. 백엔드 자체 회원가입은 사용하지 않습니다.
- 응답: `410` + `{ "ok": false, "error": "...Supabase Auth..." }`

### POST `/api/auth/login`
- Deprecated. 백엔드 자체 로그인은 사용하지 않습니다.
- 응답: `410` + `{ "ok": false, "error": "...Supabase Auth..." }`

### GET `/api/auth/me`
- 현재 토큰의 사용자 식별 정보를 확인합니다.
- 인증 토큰은 아래 2종을 모두 허용합니다.
  - Supabase Access Token
  - Kakao 커스텀 OAuth로 발급된 백엔드 JWT

Response 예시
```json
{
  "ok": true,
  "user": {
    "id": "<supabase-user-uuid-or-kakao:id>",
    "email": "user@example.com",
    "provider": "supabase",
    "name": "사용자명"
  }
}
```

### GET `/api/auth/kakao/start`
- 카카오 커스텀 OAuth 시작 URL을 발급합니다.

Query
- `redirectTo` (string, 선택): 로그인 완료 후 프론트로 리다이렉트할 URL

Response 예시
```json
{
  "ok": true,
  "authorizeUrl": "https://kauth.kakao.com/oauth/authorize?...",
  "state": "<signed-state-jwt>"
}
```

### GET `/api/auth/kakao/callback`
- 카카오 인가 코드 콜백 엔드포인트입니다.
- 서버가 카카오 토큰 교환/프로필 조회 후, `redirectTo`로 리다이렉트합니다.
- 리다이렉트 URL Query에 아래가 추가됩니다.
  - `token`: 백엔드 JWT
  - `provider`: `kakao`

비고
- 카카오 개발자 콘솔 Redirect URI와 `KAKAO_REDIRECT_URI`는 반드시 동일해야 합니다.
- 예시(배포): `https://node-smartfarm-backend.onrender.com/api/auth/kakao/callback`
- 카카오 사용자도 내부 `user.id`는 UUID 형식으로 정규화되어 저장/조회됩니다.

---

## 3) 온실 설정 (Greenhouse)

### GET `/api/greenhouse`
Query
- `greenhouseId` (string, 필수)

### GET `/api/greenhouses`
- 로그인 사용자가 소유한 온실 목록 조회

### POST `/api/greenhouse`
Body
- `greenhouseId` (string, 필수)
- `plantType` (string, 선택, 기본값 `sansevieria`)
- `locationType` (`indoor` | `outdoor`, 선택, 기본값 `indoor`)
- `useSensor` (boolean, 선택, 기본값 `true`)
- `lat` (number, 선택)
- `lon` (number, 선택)

비고
- 최초 생성 시 요청 사용자 소유(`user_id`)로 저장됩니다.
- 기존 온실은 소유자만 수정 가능합니다.

### DELETE `/api/greenhouse`
Body 또는 Query
- `greenhouseId` (string, 필수)

비고
- 소유자 본인 온실만 삭제 가능합니다.
- 관련 센서/날씨/알림/동작/리포트/식물 등록 데이터도 함께 정리됩니다.

---

## 4) 센서/장치 데이터

### GET `/api/latest`
### GET `/api/history`
### GET `/api/actuators`
### GET `/api/weather`
### GET `/api/alerts`

공통 Query
- `greenhouseId` (string, 필수)

`/api/history` 추가 Query
- `minutes` (number, 선택, 기본값 `60`, 최소 `1`, 최대 `1440`)

`/api/alerts` 추가 Query
- `limit` (number, 선택, 기본값 `20`, 최소 `1`, 최대 `100`)

`/api/latest`, `/api/history` 응답 필드 추가
- `is_weather_fallback` (boolean): 실외 + 센서 미사용 상태에서 날씨 대체값이면 `true`
- `data_source` (`sensor` | `weather_fallback`): 데이터 출처

---

## 5) 제어

### POST `/api/control`
Body
- `greenhouseId` (string, 필수)
- `actuator` (`pump` | `led` | `window`, 필수)
- `action` (`ON` | `OFF` | `OPEN` | `CLOSE`, 필수)

---

## 6) 시뮬레이션

### POST `/api/simulate/publish`
Body
- `greenhouseId` (string, 필수)
- `plantType` (string, 선택, 기본값 `sansevieria`)
- `temperature` (number, 필수)
- `humidity` (number, 필수)
- `soilMoisture` (number, 필수)
- `lux` (number, 선택)
- `ts` (string, 선택, ISO-8601)

비고
- 입력값으로 MQTT 토픽 `farm/{greenhouseId}/sensor`에 1회 발행합니다.

### POST `/api/simulate/start`
Body
- `greenhouseId` (string, 필수)
- `plantType` (string, 선택, 기본값 `sansevieria`)
- `temperature` (number, 필수)
- `humidity` (number, 필수)
- `soilMoisture` (number, 필수)
- `lux` (number, 선택)
- `intervalMs` (number, 선택, 기본값 `2000`, 최소 `500`, 최대 `60000`)
- `temperatureDelta` (number, 선택, 기본값 `0.4`)
- `humidityDelta` (number, 선택, 기본값 `1.0`)
- `soilDelta` (number, 선택, 기본값 `0.6`)
- `luxDelta` (number, 선택, 기본값 `300`)

비고
- 온실별로 1개 시뮬레이션 세션만 유지됩니다. 이미 실행 중이면 기존 세션을 교체합니다.

### POST `/api/simulate/stop`
Body
- `greenhouseId` (string, 필수)

비고
- 해당 온실의 주기 발행 시뮬레이션을 중지합니다.

---

## 7) 식물

### GET `/api/plant/list`
- 식물 마스터 목록 조회

### POST `/api/plant/recommend`
Body
- `locationType` (`indoor` | `outdoor`, 필수)
- `lightLevel` (`low` | `medium` | `high`, 선택)
- `waterFreq` (`low` | `medium` | `high`, 선택)
- `bugSensitive` (boolean, 선택)

Response
- `{ "plants": [...] }`
- 또는 `{ "plants": [], "message": "조건에 맞는 식물이 없습니다" }`

### POST `/api/plant/register`
Body
- `greenhouseId` (string, 필수)
- `plantKey` (string, 필수)

Response
```json
{ "ok": true, "greenhouseId": "gh1", "plantKey": "sansevieria" }
```

### DELETE `/api/plant/register`
Body
- `greenhouseId` (string, 필수)
- `plantKey` (string, 선택)

비고
- `plantKey`를 보내면 해당 식물만 등록 해제합니다.
- `plantKey`를 생략하면 해당 온실의 등록 식물을 모두 해제합니다.

---

## 8) 리포트

### GET `/api/reports`
### GET `/api/reports/today`
### POST `/api/reports/generate`
### POST `/api/report/daily`
### GET `/api/report/daily`
### GET `/api/report/latest`
### POST `/api/report/chat`

공통
- 온실 단위 API는 `greenhouseId` 필수
- `/api/report/daily`는 `date` (`YYYY-MM-DD`) 필수
- 서버는 매일 20:00(`REPORT_SCHEDULE_TIMEZONE`, 기본 `Asia/Seoul`)에 온실별 일일 리포트를 생성합니다.
- 웹 푸시 구독이 등록된 경우, 일일 리포트 생성 직후 요약 알림을 자동 발송합니다.

`/api/report/chat` Body
- `greenhouseId` (string, 필수)
- `message` (string, 필수, 최대 1000자)
- `chatHistory` (array, 선택)
  - 원소: `{ "role": "user" | "assistant", "content": "..." }`
  - 서버는 최근 10개만 사용

`/api/report/chat` Response 예시
```json
{
  "ok": true,
  "reply": "오늘 위험도가 높은 이유는 습도와 알림 빈도 증가 때문입니다..."
}
```

---

## 9) 질병 이미지 분석 (AI 서버 연동)

### POST `/api/disease/predict`
- `multipart/form-data`
- 필드명: `image`
- 허용 확장자: `jpg`, `jpeg`, `png`, `webp`
- 최대 크기: `5MB`
- 백엔드는 업로드 이미지를 FastAPI AI 서버로 전달해 분석 결과를 반환합니다.

성공 응답 예시
```json
{
  "ok": true,
  "prediction": {
    "result": "healthy",
    "label": "healthy",
    "classIndex": 1,
    "confidence": 1.0,
    "probabilities": {
      "disease": 0.00001,
      "healthy": 0.99998
    },
    "message": "현재 이미지에서는 뚜렷한 질병 징후가 보이지 않습니다."
  }
}
```

실패 응답 예시
```json
{
  "ok": false,
  "error": "AI 질병 분석 서버 호출에 실패했습니다."
}
```

---

## 10) 웹 푸시 (Firebase 없이 Web Push 표준)

사전 조건
- HTTPS 환경에서 동작 (localhost 개발 예외)
- 백엔드에 VAPID 환경변수 설정 필요:
  - `WEB_PUSH_VAPID_PUBLIC_KEY`
  - `WEB_PUSH_VAPID_PRIVATE_KEY`
  - `WEB_PUSH_SUBJECT` (예: `mailto:you@example.com`)

### GET `/api/push/public-key`
- 프론트가 Push 구독 시 사용할 VAPID 공개키 조회

Response 예시
```json
{
  "ok": true,
  "publicKey": "<VAPID_PUBLIC_KEY>"
}
```

### POST `/api/push/subscribe`
- 사용자 브라우저 PushSubscription 등록/갱신

Body
- `greenhouseId` (string, 필수)
- `subscription` (object, 필수)
  - `endpoint` (string)
  - `expirationTime` (number|null)
  - `keys.p256dh` (string)
  - `keys.auth` (string)

Response 예시
```json
{ "ok": true }
```

### DELETE `/api/push/subscribe`
- 사용자 브라우저 구독 해제

Body
- `greenhouseId` (string, 필수)
- `endpoint` (string, 필수)

Response 예시
```json
{ "ok": true, "removed": true }
```

### POST `/api/push/test`
- 현재 사용자/온실의 등록된 구독들에 테스트 푸시 발송

Body
- `greenhouseId` (string, 필수)
- `title` (string, 선택, 기본값: `"테스트 알림"`)
- `body` (string, 선택, 기본값: `"웹 푸시 연결 테스트입니다."`)
- `url` (string, 선택, 기본값: `"/"`)

Response 예시
```json
{
  "ok": true,
  "sent": 1,
  "failed": 0
}
```

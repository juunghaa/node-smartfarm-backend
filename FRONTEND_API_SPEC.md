# SmartFarm 백엔드 API 명세서 (Frontend 전달용)

최종 수정일: 2026-05-12

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

### 인증 방식 (Supabase)
- 프론트에서 Supabase Auth로 로그인/회원가입을 처리합니다.
- 백엔드 API 호출 시 Supabase Access Token을 헤더에 포함합니다.
- 헤더: `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

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

Response 예시
```json
{
  "ok": true,
  "user": {
    "id": "<supabase-user-uuid>",
    "email": "user@example.com"
  }
}
```

---

## 3) 온실 설정 (Greenhouse)

### GET `/api/greenhouse`
Query
- `greenhouseId` (string, 필수)

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

---

## 5) 제어

### POST `/api/control`
Body
- `greenhouseId` (string, 필수)
- `actuator` (`pump` | `led` | `window`, 필수)
- `action` (`ON` | `OFF` | `OPEN` | `CLOSE`, 필수)

---

## 6) 식물

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

---

## 7) 리포트

### GET `/api/reports`
### GET `/api/reports/today`
### POST `/api/reports/generate`
### POST `/api/report/daily`
### GET `/api/report/daily`
### GET `/api/report/latest`

공통
- 온실 단위 API는 `greenhouseId` 필수
- `/api/report/daily`는 `date` (`YYYY-MM-DD`) 필수

---

## 8) 질병 이미지 분석 (AI 서버 연동)

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

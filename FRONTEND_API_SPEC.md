# SmartFarm 백엔드 API 명세서 (Frontend 전달용)

최종 수정일: 2026-05-04

## 1) 공통

### Base URL
- 로컬: `http://localhost:3000`
- 배포: `https://<render-url>`

### 공통 응답
- 성공: `200` + JSON
- 검증 오류: `400` + `{ "error": "..." }`
- 서버 오류: `500` + `{ "error": "..." }`
- 요청 제한(식물 추천): `429` + `{ "error": "추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }`
- 파일 업로드 제한: `400` + `{ "ok": false, "error": "이미지 파일은 최대 5MB까지 업로드할 수 있습니다." }`

### greenhouseId 정책 (중요)
- 온실 단위 API는 대부분 `greenhouseId`를 반드시 전달해야 합니다.
- 기존 기본값 `"gh1"` 폴백은 제거되었습니다.
- 하위 호환으로 `greenhouseID`도 허용하지만, 프론트는 `greenhouseId`만 사용 권장합니다.

### MQTT / 센서 처리 정책
- `ENABLE_MQTT=true`이면 서버 시작 시 MQTT에 연결합니다.
- 센서 데이터는 해당 온실의 `greenhouses.use_sensor = true`일 때만 처리됩니다.
- `use_sensor=false`이면 해당 온실 토픽 메시지는 무시됩니다.

---

## 2) 온실 설정 (Greenhouse)

### GET `/api/greenhouse`
온실 설정 정보를 조회합니다.

Query
- `greenhouseId` (string, 필수)

Response 예시
```json
{
  "id": 1,
  "greenhouse_id": "gh1",
  "plant_type": "sansevieria",
  "location_type": "indoor",
  "use_sensor": true,
  "lat": 37.5665,
  "lon": 126.9780,
  "created_at": "2026-04-14T12:45:47Z"
}
```

### POST `/api/greenhouse`
온실 설정을 등록/수정(Upsert)합니다.

Body
- `greenhouseId` (string, 필수)
- `plantType` (string, 선택, 기본값 `sansevieria`)
- `locationType` (`indoor` | `outdoor`, 선택, 기본값 `indoor`)
- `useSensor` (boolean, 선택, 기본값 `true`)
- `lat` (number, 선택)
- `lon` (number, 선택)

비고
- 하위 호환으로 `use_sensor`(snake_case)도 허용됩니다.

식물 타입 값
- `sansevieria`, `monstera`, `tomato`, `lettuce`, `greenOnion`

---

## 3) 센서 데이터 (Sensor Data)

### GET `/api/latest`
해당 온실의 최신 센서 데이터 1건을 조회합니다.

Query
- `greenhouseId` (string, 필수)

Response
- 센서 객체 또는 `null`

### GET `/api/history`
센서 이력 데이터를 조회합니다. (시간 오름차순)

Query
- `greenhouseId` (string, 필수)
- `minutes` (number, 선택, 기본값 `60`, 최소 `1`, 최대 `1440`)

Response
- 센서 행 배열

센서 주요 필드
- `greenhouse_id`
- `temperature`
- `humidity`
- `soil_moisture`
- `ts`

---

## 4) 액추에이터 제어 (Actuator)

### GET `/api/actuators`
최근 액추에이터 로그 50건을 조회합니다.

Query
- `greenhouseId` (string, 필수)

### POST `/api/control`
수동 액추에이터 제어 요청입니다.

Body
- `greenhouseId` (string, 필수)
- `actuator` (`pump` | `led` | `window`, 필수)
- `action` (`ON` | `OFF` | `OPEN` | `CLOSE`, 필수)

Response 예시
```json
{ "ok": true, "actuator": "pump", "action": "ON" }
```

---

## 5) 외부 날씨 (Weather)

### GET `/api/weather`
해당 온실의 최신 날씨 로그를 조회합니다.

Query
- `greenhouseId` (string, 필수)

주요 필드
- `outdoor_temp`
- `outdoor_humidity`
- `rain_prob` (0-100)
- `weather_desc` (OpenWeather 원문, 보통 영문)

비고
- 한글 날씨명은 프론트에서 매핑 처리하세요.

---

## 6) 알림 (Alerts)

### GET `/api/alerts`
해당 온실의 알림 로그를 조회합니다.

Query
- `greenhouseId` (string, 필수)
- `limit` (number, 선택, 기본값 `20`, 최소 `1`, 최대 `100`)

`alert_type` 예시
- `humidity_high`, `humidity_low`
- `temp_high`, `temp_low`
- `pest_risk_high`

---

## 7) 식물 (Plant)

### GET `/api/plant/list`
등록된 식물 목록을 조회합니다.

### POST `/api/plant/recommend`
사용자 환경 기반 식물 추천 API입니다.

Body
- `locationType` (`indoor` | `outdoor`, 필수)
- `lightLevel` (`low` | `medium` | `high`, 선택)
- `waterFreq` (`low` | `medium` | `high`, 선택)
- `bugSensitive` (boolean, 선택)

요청 제한
- IP 기준 1분당 최대 3회 (`429` 반환)

Response
- `{ plants: [...] }`
- 또는 `{ plants: [], message: "조건에 맞는 식물이 없습니다" }`

### POST `/api/plant/register`
온실에 식물을 등록하고 `greenhouses.plant_type`을 함께 업데이트합니다.

Body
- `greenhouseId` (string, 필수)
- `plantKey` (string, 필수)

Response
```json
{ "ok": true, "greenhouseId": "gh1", "plantKey": "sansevieria" }
```

---

## 8) 리포트 (Reports)

### POST `/api/report/daily`
특정 날짜의 일일 리포트를 생성/저장합니다.  
이미 같은 `greenhouseId + date`가 있으면 업데이트됩니다(UPSERT).

Body
- `greenhouseId` (string, 필수)
- `date` (string, 필수, `YYYY-MM-DD`)

Response 예시
```json
{
  "greenhouseId": "gh1",
  "date": "2026-04-27",
  "avgTemp": 25.3,
  "avgHumidity": 62.1,
  "avgSoil": 35.4,
  "avgLux": 500.0,
  "dataCount": 1440,
  "alertCount": 2,
  "alertTypeCounts": {
    "humidity_high": 1,
    "pest_risk_high": 1
  },
  "riskLevel": "medium",
  "summary": "오늘 온실은 전반적으로 관리 가능하지만 일부 환경 지표 점검이 필요합니다.",
  "recommendations": [
    "토양 수분이 낮아질 경우 관수 장치와 급수 일정을 확인하세요.",
    "습도가 높은 편이므로 환기 또는 제습을 고려하세요."
  ],
  "createdAt": "2026-04-27T20:00:01.123Z"
}
```

### GET `/api/report/daily`
특정 날짜의 일일 리포트를 조회합니다.

Query
- `greenhouseId` (string, 필수)
- `date` (string, 필수, `YYYY-MM-DD`)

Response
- 리포트 객체 또는 `null`

### GET `/api/report/latest`
최신 일일 리포트 1건을 조회합니다.

Query
- `greenhouseId` (string, 필수)

Response
- 리포트 객체 또는 `null`

### (호환용 기존 엔드포인트)
- `GET /api/reports` : 최근 리포트 목록 조회 (`limit` 지원, 기본 7, 최대 30)
- `GET /api/reports/today` : 오늘 리포트 조회
- `POST /api/reports/generate` : 오늘 리포트 즉시 생성

---

## 9) 권장 온보딩 순서

1. `POST /api/greenhouse`로 `greenhouseId`, `plantType`, `locationType`, `useSensor` 저장
2. 센서 사용 온실이면 `useSensor=true`로 설정
3. 대시보드 조회 API 호출
- `/api/latest`
- `/api/history`
- `/api/weather`
- `/api/alerts`
4. 수동 제어 필요 시 `/api/control` 호출

---

## 10) 질병 이미지 분석 (Disease - Mock)

### POST `/api/disease/predict`
식물 이미지를 업로드하면 질병 분석(mock) 결과를 반환합니다.  
현재는 모델 학습 전 단계이므로 mock 응답이며, 추후 실제 모델로 교체 예정입니다.

요청 형식
- `multipart/form-data`
- 필드명: `image`

업로드 제약
- 허용 확장자: `jpg`, `jpeg`, `png`, `webp`
- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`
- 최대 용량: `5MB`

성공 응답 예시
```json
{
  "ok": true,
  "prediction": {
    "result": "disease",
    "label": "disease",
    "confidence": 0.91,
    "message": "질병이 의심됩니다. 잎의 상태를 확인해주세요."
  }
}
```

정상(healthy) 예시
```json
{
  "ok": true,
  "prediction": {
    "result": "healthy",
    "label": "healthy",
    "confidence": 0.88,
    "message": "현재 이미지에서는 뚜렷한 질병 징후가 보이지 않습니다."
  }
}
```

실패 응답 예시
```json
{
  "ok": false,
  "error": "이미지 파일은 필수입니다."
}
```

```json
{
  "ok": false,
  "error": "지원하지 않는 파일 형식입니다. jpg/jpeg/png/webp만 업로드 가능합니다."
}
```

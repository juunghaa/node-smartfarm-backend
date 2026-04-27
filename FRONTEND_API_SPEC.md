# SmartFarm 백엔드 API 명세서 (Frontend 전달용)

최종 수정일: 2026-04-27

## 1) 공통

### Base URL
- 로컬: `http://localhost:3000`
- 배포: `https://<render-url>`

### 공통 응답
- 성공: `200` + JSON
- 검증 오류: `400` + `{ "error": "..." }`
- 서버 오류: `500` + `{ "error": "..." }`
- 요청 제한(식물 추천): `429` + `{ "error": "추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }`

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

### GET `/api/reports`
리포트 이력을 조회합니다.

Query
- `greenhouseId` (string, 필수)
- `limit` (number, 선택, 기본값 `7`, 최소 `1`, 최대 `30`)

### GET `/api/reports/today`
오늘 리포트 1건을 조회합니다.

Query
- `greenhouseId` (string, 필수)

Response
- 리포트 객체 또는 `null`

### POST `/api/reports/generate`
리포트를 즉시 생성합니다. (수동/테스트 용도)

Body
- `greenhouseId` (string, 필수)

Response
```json
{ "ok": true, "reportText": "..." }
```

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


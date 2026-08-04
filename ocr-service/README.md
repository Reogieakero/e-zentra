# PaddleOCR microservice for the Zentra backend.

Self-hosted OCR engine behind the backend's `OcrEngine` abstraction
(`backend/src/services/ocr/httpEngine.ts`). It rasterizes PDF pages, runs
PaddleOCR PP-Structure table recognition, and returns a normalized JSON
contract that the backend consumes.

## Contract

`POST /ocr` (multipart form)

Fields:
- `kind` (string) — upload kind (`report-card`, ...)
- `file` (file) — the scanned document (PDF/JPEG/PNG/WebP)

Auth: `Authorization: Bearer <OCR_SERVICE_TOKEN>` (must match the backend's
`OCR_SERVICE_TOKEN` env var).

Response 200 JSON:

```json
{
  "engine": "paddle",
  "pageCount": 1,
  "fields": [
    { "key": "lrn", "rawValue": "123456789012", "confidence": 0.98, "page": 1 },
    { "key": "student_name", "rawValue": "JUAN DELA CRUZ", "confidence": 0.97, "page": 1 },
    { "key": "grade:FIL", "rawValue": "92", "confidence": 0.96, "page": 1 },
    { "key": "remarks:FIL", "rawValue": "Passed", "confidence": 0.95, "page": 1 }
  ],
  "raw": { ... }
}
```

`fields` uses the same `key` vocabulary as the backend fake engine
(`lrn`, `student_name`, `grade:<SUBJECT_CODE>`, `remarks:<SUBJECT_CODE>`),
so the backend validation layer is engine-agnostic.

## Run

```bash
docker build -t zentra-ocr .
docker run --rm -p 8000:8000 -e OCR_SERVICE_TOKEN=change-me zentra-ocr
```

Backend env: `OCR_ENGINE=paddle`, `OCR_SERVICE_URL=http://localhost:8000`,
`OCR_SERVICE_TOKEN=change-me`.

import os
import tempfile
from typing import List, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from paddleocr import PPStructure
from pypdfium2 import PdfDocument

app = FastAPI(title="Zentra OCR Service", version="0.1.0")

OCR_TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "change-me")

engine: Optional[PPStructure] = None


def get_engine() -> PPStructure:
    global engine
    if engine is None:
        engine = PPStructure(show_log=False, use_gpu=False)
    return engine


def rasterize_pdf(path: str, out_dir: str) -> List[str]:
    """Render each PDF page to a PNG under out_dir and return the paths."""
    pdf = PdfDocument(path)
    pages = []
    for i in range(len(pdf)):
        page = pdf[i]
        bitmap = page.render(scale=2.0)
        out = os.path.join(out_dir, f"page_{i + 1}.png")
        bitmap.to_pil().save(out)
        pages.append(out)
    return pages


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "engine": "paddle"})


@app.post("/ocr")
def run_ocr(
    kind: str = Form(...),
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
) -> JSONResponse:
    expected = f"Bearer {OCR_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    suffix = os.path.splitext(file.filename or "doc.pdf")[1].lower()
    with tempfile.TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, "input" + suffix)
        with open(input_path, "wb") as fh:
            fh.write(file.file.read())

        if suffix == ".pdf":
            pages = rasterize_pdf(input_path, tmp)
        else:
            pages = [input_path]

        engine = get_engine()
        fields = []
        for idx, page_path in enumerate(pages):
            result = engine(page_path)
            for region in result:
                if "res" not in region:
                    continue
                for line in region["res"]:
                    text = line.get("text", "").strip()
                    if not text:
                        continue
                    confidence = float(line.get("confidence", 0.0))
                    fields.append(parse_line(text, confidence, idx + 1))

        return JSONResponse({"engine": "paddle", "pageCount": len(pages), "fields": fields, "raw": {"kind": kind}})


def parse_line(text: str, confidence: float, page: int) -> dict:
    """Best-effort mapping from a recognized line to the backend field contract."""
    # Student number / LRN (12 digits) or with spaces/dashes.
    import re
    digits = re.sub(r"[^0-9]", "", text)
    if len(digits) == 12:
        return {"key": "lrn", "rawValue": text, "confidence": confidence, "page": page}
    return {"key": "line", "rawValue": text, "confidence": confidence, "page": page}

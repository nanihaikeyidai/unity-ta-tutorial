#!/usr/bin/env python3
"""Generate IndexTTS 2.5 narration via RunningHub workflow and convert to mp3.

Requires env RUNNINGHUB_API_KEY. Runs tasks sequentially.
Usage:
  python3 scripts/generate_tts.py              # all
  python3 scripts/generate_tts.py speech-l1    # one id
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio"
SPEECHES = ROOT / "scripts" / "speeches.json"
REF_META = Path("/workspace/runninghub/voices/indextts25-ref-upload.json")
LOCAL_REF = Path("/workspace/runninghub/voices/indextts25-ref.wav")

WORKFLOW_ID = "1970149188463980545"
CREATE_URL = "https://www.runninghub.cn/task/openapi/create"
OUT_URL = "https://www.runninghub.cn/task/openapi/outputs"
UPLOAD_URL = "https://www.runninghub.cn/task/openapi/upload"

# nodeId 46 = reference audio; nodeId 47 = prompt text
NODE_AUDIO = "46"
NODE_PROMPT = "47"


def api_key() -> str:
    key = os.environ.get("RUNNINGHUB_API_KEY", "").strip()
    if not key:
        raise SystemExit("RUNNINGHUB_API_KEY is not set")
    return key


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Host": "www.runninghub.cn",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_ref_filename() -> str:
    if REF_META.exists():
        meta = json.loads(REF_META.read_text(encoding="utf-8"))
        name = (meta.get("data") or {}).get("fileName")
        if name:
            return name
    if not LOCAL_REF.exists():
        raise SystemExit(f"Missing reference voice: {LOCAL_REF}")
    return upload_ref(LOCAL_REF)


def upload_ref(path: Path) -> str:
    """Multipart upload; returns RunningHub fileName."""
    import uuid

    boundary = f"----RhBoundary{uuid.uuid4().hex}"
    key = api_key()
    body = bytearray()

    def add_field(name: str, value: str) -> None:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
        )
        body.extend(value.encode("utf-8"))
        body.extend(b"\r\n")

    add_field("apiKey", key)
    add_field("fileType", "audio")
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        (
            f'Content-Disposition: form-data; name="file"; '
            f'filename="{path.name}"\r\n'
            f"Content-Type: audio/wav\r\n\r\n"
        ).encode()
    )
    body.extend(path.read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        UPLOAD_URL,
        data=bytes(body),
        method="POST",
        headers={
            "Host": "www.runninghub.cn",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    if str(result.get("code")) not in ("0", "0"):
        if result.get("code") != 0:
            raise RuntimeError(f"Upload failed: {result}")
    name = (result.get("data") or {}).get("fileName")
    if not name:
        raise RuntimeError(f"No fileName in upload response: {result}")
    REF_META.parent.mkdir(parents=True, exist_ok=True)
    REF_META.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(f"  uploaded ref -> {name}", flush=True)
    return name


def start_task(text: str, ref_file: str) -> str:
    payload = {
        "apiKey": api_key(),
        "workflowId": WORKFLOW_ID,
        "nodeInfoList": [
            {
                "nodeId": NODE_AUDIO,
                "fieldName": "audio",
                "fieldValue": ref_file,
            },
            {
                "nodeId": NODE_PROMPT,
                "fieldName": "prompt",
                "fieldValue": text,
            },
        ],
    }
    result = post_json(CREATE_URL, payload)
    data = result.get("data") or {}
    task_id = data.get("taskId") or result.get("taskId")
    if not task_id:
        raise RuntimeError(f"No taskId in response: {result}")
    return str(task_id)


def poll_outputs(task_id: str, timeout_s: int = 600) -> list[str]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            result = post_json(OUT_URL, {"apiKey": api_key(), "taskId": task_id})
        except urllib.error.HTTPError as e:
            print(f"  poll HTTP {e.code}, retry...", flush=True)
            time.sleep(5)
            continue
        code = result.get("code")
        if code == 0 or str(code) == "0":
            data = result.get("data") or []
            urls: list[str] = []
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        u = item.get("fileUrl") or item.get("url")
                        if u:
                            urls.append(u)
                    elif isinstance(item, str):
                        urls.append(item)
            elif isinstance(data, dict):
                u = data.get("fileUrl") or data.get("url")
                if u:
                    urls.append(u)
            if urls:
                return urls
        # 804 = running / queued
        msg = str(result.get("msg") or result.get("message") or "")
        print(f"  poll task={task_id} code={code} msg={msg[:80]}", flush=True)
        time.sleep(5)
    raise TimeoutError(f"Task {task_id} timed out after {timeout_s}s")


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "unity-ta-tts/2.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, open(dest, "wb") as f:
        f.write(resp.read())


def to_mp3(src: Path, mp3: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(mp3),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def generate_one(sid: str, text: str, ref_file: str) -> Path:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    mp3 = AUDIO_DIR / f"{sid}.mp3"
    raw = AUDIO_DIR / f"{sid}.flac"
    print(f"[{sid}] starting ({len(text)} chars)...", flush=True)
    task_id = start_task(text, ref_file)
    print(f"[{sid}] taskId={task_id}", flush=True)
    urls = poll_outputs(task_id)
    print(f"[{sid}] got {len(urls)} file(s)", flush=True)
    download(urls[0], raw)
    to_mp3(raw, mp3)
    try:
        raw.unlink()
    except OSError:
        pass
    print(f"[{sid}] wrote {mp3} ({mp3.stat().st_size} bytes)", flush=True)
    return mp3


def main() -> None:
    speeches = json.loads(SPEECHES.read_text(encoding="utf-8"))
    only = sys.argv[1:]
    ids = only if only else list(speeches.keys())
    ref_file = load_ref_filename()
    print(f"ref fileName={ref_file}", flush=True)
    for sid in ids:
        if sid not in speeches:
            raise SystemExit(f"Unknown id: {sid}")
        generate_one(sid, speeches[sid], ref_file)
        time.sleep(2)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()

import argparse
import asyncio
import base64
import json
from pathlib import Path
from openai import OpenAI

MODEL = "gpt-6.1-sol"
SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "door_zero_question",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "is_question_page": {"type": "boolean"},
                "topic": {"type": "string"},
                "question_text": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                "correct_option_index": {"type": "integer", "minimum": -1, "maximum": 3},
                "solution_text": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["is_question_page", "topic", "question_text", "options", "correct_option_index", "solution_text", "confidence"],
        },
    },
}

PROMPT = """أنت محرر دقيق لمحتوى اختبار القدرات الكمية باللغة العربية. أمامك صورتان للصفحة نفسها: صورة السؤال العلوية قبل الحل، والصورة الأصلية التي يظهر فيها الحل اليدوي والعلامة على الاختيار الصحيح.

استخرج البيانات فقط من الصورة ولا تخمّن. إذا كانت الصفحة غلافًا أو شاشة شرح أو لا تحتوي سؤال اختيار من أربعة اختيارات، اجعل is_question_page=false، واستخدم نصوصًا فارغة، وcorrect_option_index=-1.
إذا كانت سؤالًا: اكتب نص السؤال كما يظهر بالعربية، وانسخ الاختيارات الأربعة بالترتيب من اليمين إلى اليسار كما هي. حدّد الاختيار الصحيح من الدائرة/العلامة والحل المكتوب في الصورة الأصلية. اكتب solution_text شرحًا عربيًا قصيرًا قابلًا للعرض في الموقع، لا تذكر أنك رأيت صورة. اكتب topic باسم موضوع رياضي محدد مثل: المتباينات، النسب، الكسور، النسبة المئوية، العمليات، المتوسط، الهندسة، أو غير ذلك. إذا كان جزء من النص غير مقروء، لا تستبدله بتخمين؛ اتركه واضحًا بما أمكن وخفّض confidence."""


def data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return "data:image/jpeg;base64," + encoded


def extract_one(page: int, render_dir: Path):
    client = OpenAI()
    image = render_dir / f"page-{page:03d}.jpg"
    if not image.exists():
        raise FileNotFoundError(image)
    # Use the same page image twice: the model reads the upper question area first,
    # then checks the original page for the marked answer and written solution.
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": [
                {"type": "text", "text": f"صفحة المصدر رقم {page}. استخرج السؤال والحل في JSON."},
                {"type": "image_url", "image_url": {"url": data_url(image), "detail": "high"}},
            ]},
        ],
        response_format=SCHEMA,
        max_completion_tokens=1800,
        extra_body={"reasoning": {"effort": "low"}},
    )
    content = resp.choices[0].message.content
    result = json.loads(content)
    result["sourcePage"] = page
    return result


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--render-dir", default="/tmp/door0-render")
    parser.add_argument("--output", required=True)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--skip", default="", help="comma-separated source pages to skip")
    args = parser.parse_args()
    skipped = {int(item) for item in args.skip.split(",") if item.strip()}
    pages = [p for p in range(args.start, args.end + 1) if p not in skipped]
    sem = asyncio.Semaphore(args.concurrency)

    async def run(page):
        async with sem:
            try:
                return {"ok": True, "value": await asyncio.to_thread(extract_one, page, Path(args.render_dir))}
            except Exception as exc:
                return {"ok": False, "sourcePage": page, "error": str(exc)}

    results = await asyncio.gather(*(run(page) for page in pages))
    Path(args.output).write_text("\n".join(json.dumps(item, ensure_ascii=False) for item in results) + "\n")
    print(json.dumps({"pages": len(pages), "success": sum(item["ok"] for item in results), "failed": sum(not item["ok"] for item in results), "output": args.output}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())

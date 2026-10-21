"""Family Space local development server. Loopback-only, fictional data only.
Run: python3 server/family_local.py ; open http://127.0.0.1:8765/family-local.html
Requires Python 3.10+; no external packages.
"""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import json, os, sqlite3, uuid

ROOT = Path(__file__).resolve().parents[1]
DB = Path(os.environ.get("FAMILY_SQLITE_PATH", str(Path.home() / ".family-space" / "development.sqlite3")))
DB.parent.mkdir(parents=True, exist_ok=True)

def connect():
    db = sqlite3.connect(DB, timeout=5)
    db.execute("PRAGMA foreign_keys = ON")
    db.row_factory = sqlite3.Row
    return db

def initialize():
    with connect() as db:
        db.executescript((ROOT / "db/sqlite/001_family_foundation.sql").read_text())

def validate_question(q):
    if not isinstance(q, dict) or q.get("schemaVersion") != "family-authoring/1":
        raise ValueError("Unsupported question schema")
    if not isinstance(q.get("id"), str) or not q["id"] or not q.get("prompt") or not q.get("subject"):
        raise ValueError("Question id, prompt and subject are required")
    if not isinstance(q.get("revision"), int) or q["revision"] < 1:
        raise ValueError("Question revision must be positive")
    parts = q.get("parts")
    if not isinstance(parts, list) or not parts:
        raise ValueError("Question requires at least one part")
    if len({p.get("id") for p in parts if isinstance(p, dict)}) != len(parts):
        raise ValueError("Part IDs must be unique")
    for part in parts:
        if not isinstance(part, dict) or not part.get("id") or not part.get("prompt"):
            raise ValueError("Part id and prompt required")
        kind = part.get("kind")
        if kind not in ("single_choice","multi_choice","short_text","number","long_text"):
            raise ValueError("Unsupported answer kind")
        spec = part.get("answerSpec")
        if kind in ("single_choice","multi_choice"):
            options = part.get("options")
            if not isinstance(options,list) or len(options)<2 or len(options)!=len(set(options)):
                raise ValueError("Distinct answer options required")
            if spec:
                correct=spec.get("correct")
                chosen=[correct] if kind=="single_choice" else correct
                if not isinstance(chosen,list) or not chosen or any(c not in options for c in chosen):
                    raise ValueError("Correct choices must exist in options")
        if kind=="number" and spec is not None and (not isinstance(spec.get("correct"),(int,float)) or isinstance(spec.get("correct"),bool)):
            raise ValueError("Number answer expected")
        if kind=="long_text" and spec is not None and not spec.get("reviewGuidance"):
            raise ValueError("Long answer requires manual review guidance")

def validate_assignment(a):
    if not isinstance(a,dict) or a.get("schemaVersion") != "family-authoring/1" or not a.get("id") or not a.get("title"):
        raise ValueError("Invalid workbook header")
    if not isinstance(a.get("revision"),int) or a["revision"]<1:
        raise ValueError("Invalid workbook revision")
    sections=a.get("sections")
    if not isinstance(sections,list) or not sections:
        raise ValueError("Workbook requires sections")
    count=0
    section_ids=set()
    item_ids=set()
    for section in sections:
        if not section.get("id") or not section.get("title") or section["id"] in section_ids:
            raise ValueError("Section ID/title missing or duplicated")
        section_ids.add(section["id"])
        for item in section.get("items",[]):
            if not item.get("id") or item["id"] in item_ids:
                raise ValueError("Duplicate or missing item id")
            item_ids.add(item["id"])
            question=item.get("questionSnapshot")
            validate_question(question)
            if item.get("questionId")!=question["id"] or item.get("questionRevision")!=question["revision"]:
                raise ValueError("Question reference differs from snapshot")
            count+=1
    if count==0:
        raise ValueError("Workbook requires one or more questions")

def save_document(kind, doc):
    table,versions,foreign,validator = ("family_questions","family_question_versions","question_id",validate_question) if kind=="questions" else ("family_assignments","family_assignment_versions","assignment_id",validate_assignment)
    validator(doc)
    payload=json.dumps(doc,ensure_ascii=False)
    with connect() as db:
        old=db.execute("SELECT current_revision FROM "+table+" WHERE id=?",(doc["id"],)).fetchone()
        if old and doc["revision"]<=old["current_revision"]:
            raise ValueError("Revision must increase; published snapshots cannot be overwritten")
        if old:
            fields=("subject=?, title=?, current_revision=?" if kind=="questions" else "title=?, current_revision=?")
            args=(doc["subject"],doc.get("title",""),doc["revision"],doc["id"]) if kind=="questions" else (doc["title"],doc["revision"],doc["id"])
            db.execute("UPDATE "+table+" SET "+fields+" WHERE id=?",args)
        elif kind=="questions":
            db.execute("INSERT INTO family_questions(id,current_revision,subject,title) VALUES(?,?,?,?)",(doc["id"],doc["revision"],doc["subject"],doc.get("title","")))
        else:
            db.execute("INSERT INTO family_assignments(id,current_revision,title) VALUES(?,?,?)",(doc["id"],doc["revision"],doc["title"]))
        db.execute("INSERT INTO "+versions+"("+foreign+",revision,document_json) VALUES(?,?,?)",(doc["id"],doc["revision"],payload))
    return doc

def list_documents(kind):
    table,versions,foreign = ("family_questions","family_question_versions","question_id") if kind=="questions" else ("family_assignments","family_assignment_versions","assignment_id")
    with connect() as db:
        return [json.loads(r[0]) for r in db.execute("SELECT v.document_json FROM "+table+" AS m JOIN "+versions+" AS v ON v."+foreign+"=m.id AND v.revision=m.current_revision ORDER BY m.created_at")]

def projection_question(q):
    return {k:q[k] for k in ("id","revision","subject","prompt")} | {"parts":[{k:p[k] for k in ("id","kind","prompt")}|({"options":p["options"]} if p["kind"] in ("single_choice","multi_choice") else {}) for p in q["parts"]]}

def learner_workbook(a):
    return {k:a.get(k) for k in ("id","revision","title","instructions")} | {"sections":[{"id":s["id"],"title":s["title"],"category":s.get("category",""),"items":[{"id":i["id"],"question":projection_question(i["questionSnapshot"])} for i in s["items"]]} for s in a["sections"]]}

def grade(a,answers):
    feedback={}
    for section in a["sections"]:
        for item in section["items"]:
            for part in item["questionSnapshot"]["parts"]:
                key=item["id"]+":"+part["id"]
                val=answers.get(key)
                kind=part["kind"]
                spec=part.get("answerSpec",{})
                status="manual_review"
                if kind in ("single_choice","multi_choice","number","short_text") and "correct" in spec:
                    expected=spec["correct"]
                    if kind=="multi_choice":
                        ok=isinstance(val,list) and sorted(val)==sorted(expected)
                    elif kind=="number":
                        try:ok=val is not None and float(str(val).strip())==float(expected)
                        except (TypeError,ValueError):ok=False
                    else:ok=str(val or "").strip().casefold()==str(expected).strip().casefold()
                    status="correct" if ok else "incorrect"
                feedback[key]={"status":status}
    return feedback

def submit_attempt(data):
    assignment_id=data.get("assignmentId")
    answers=data.get("answers")
    if not isinstance(answers,dict) or not isinstance(assignment_id,str):
        raise ValueError("Assignment ID and response map required")
    with connect() as db:
        row=db.execute("SELECT document_json FROM family_assignment_versions WHERE assignment_id=? ORDER BY revision DESC LIMIT 1",(assignment_id,)).fetchone()
        if row is None:raise ValueError("Unknown assignment")
        a=json.loads(row[0])
        feedback=grade(a,answers)
        attempt_id=data.get("id") or str(uuid.uuid4())
        try:
            db.execute("INSERT INTO family_attempts(id,assignment_id,assignment_revision,development_learner_id,status,answers_json,submitted_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",(attempt_id,a["id"],a["revision"],"fictional-local-test","submitted",json.dumps(answers)))
            db.execute("INSERT INTO family_evaluations(id,attempt_id,review_status,feedback_json) VALUES(?,?,?,?)",(str(uuid.uuid4()),attempt_id,"manual_review" if any(v["status"]=="manual_review" for v in feedback.values()) else "reviewed",json.dumps(feedback)))
        except sqlite3.IntegrityError:
            raise ValueError("Duplicate submission ID")
    return {"attemptId":attempt_id,"feedback":feedback}

class Handler(BaseHTTPRequestHandler):
    def reply(self,status,data):
        raw=json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw)))
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        path=urlsplit(self.path).path
        if path in ("/api/questions","/api/assignments"):
            return self.reply(200,{"data":list_documents(path.split("/")[-1])})
        if path.startswith("/api/preview/"):
            key=path.split("/")[-1]
            docs=list_documents("assignments")
            a=next((x for x in docs if x["id"]==key),None)
            return self.reply(200,{"data":learner_workbook(a)}) if a else self.reply(404,{"error":"Not found"})
        allowed={"/":("family-local.html","text/html"),"/family-local.html":("family-local.html","text/html"),"/family-local.js":("family-local.js","text/javascript"),"/css/education.css":("css/education.css","text/css"),"/js/education/domain/AuthoringContract.js":("js/education/domain/AuthoringContract.js","text/javascript"),"/js/education/EncryptedVault.js":("js/education/EncryptedVault.js","text/javascript")}
        if path not in allowed:return self.reply(404,{"error":"Not found"})
        filename,mime=allowed[path]
        raw=(ROOT / filename).read_bytes()
        self.send_response(200);self.send_header("Content-Type",mime+"; charset=utf-8");self.send_header("Content-Length",str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        path=urlsplit(self.path).path
        if path not in ("/api/questions","/api/assignments","/api/attempts"):
            return self.reply(404,{"error":"Not found"})
        try:
            size=int(self.headers.get("Content-Length","0"))
            if size<1 or size>1024*1024:raise ValueError("JSON payload must be under 1 MB")
            data=json.loads(self.rfile.read(size))
            result=submit_attempt(data) if path=="/api/attempts" else save_document(path.split("/")[-1],data)
            self.reply(200,{"data":result})
        except (ValueError,KeyError,TypeError,sqlite3.Error) as error:self.reply(400,{"error":str(error)})
    def log_message(self,*args):pass

if __name__=="__main__":
    initialize()
    server=ThreadingHTTPServer(("127.0.0.1",8765),Handler)
    print("Family Space local prototype: http://127.0.0.1:8765")
    server.serve_forever()

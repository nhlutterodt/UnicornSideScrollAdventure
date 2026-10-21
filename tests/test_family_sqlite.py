"""Integration checks for the local SQLite development service."""
import importlib.util
import sqlite3
import tempfile
import threading
from http.server import ThreadingHTTPServer
from urllib.request import urlopen, Request
import json
import unittest
from pathlib import Path

SPEC=importlib.util.spec_from_file_location("family_local",Path(__file__).resolve().parents[1]/"server"/"family_local.py")
family=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(family)

def question():
    return {"schemaVersion":"family-authoring/1","id":"q1","revision":1,"title":"Addition","subject":"Math","prompt":"Count","parts":[{"id":"p1","kind":"number","prompt":"2 + 3?","answerSpec":{"correct":5}},{"id":"p2","kind":"long_text","prompt":"Explain","answerSpec":{"reviewGuidance":"Check reasoning"}}]}

def workbook():
    return {"schemaVersion":"family-authoring/1","id":"a1","revision":1,"title":"Practice","sections":[{"id":"s1","title":"Section 1","category":"Math","items":[{"id":"i1","questionId":"q1","questionRevision":1,"questionSnapshot":question()}]}]}

class SqlitePrototypeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        family.DB=Path(self.tmp.name)/"family.sqlite3"
        family.initialize()
    def tearDown(self):
        self.tmp.cleanup()
    def test_schema_integrity(self):
        with family.connect() as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0],"ok")
            self.assertEqual(db.execute("PRAGMA foreign_keys").fetchone()[0],1)
    def test_questions_and_workbooks_survive_connection_restart(self):
        family.save_document("questions",question())
        family.save_document("assignments",workbook())
        self.assertEqual(family.list_documents("questions")[0]["id"],"q1")
        self.assertEqual(family.list_documents("assignments")[0]["sections"][0]["items"][0]["questionId"],"q1")
    def test_revision_is_immutable(self):
        family.save_document("questions",question())
        q=question()
        with self.assertRaises(ValueError):family.save_document("questions",q)
        q["revision"]=2
        family.save_document("questions",q)
        with family.connect() as db:
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("UPDATE family_question_versions SET document_json='{}' WHERE question_id='q1'")
    def test_learner_projection_strips_answer_keys(self):
        safe=family.learner_workbook(workbook())
        self.assertNotIn("answerSpec",str(safe))
        self.assertNotIn("reviewGuidance",str(safe))
    def test_submission_is_immutable_and_descriptive_review_pending(self):
        family.save_document("assignments",workbook())
        outcome=family.submit_attempt({"id":"attempt-1","assignmentId":"a1","answers":{"i1:p1":"5","i1:p2":"Because"}})
        self.assertEqual(outcome["feedback"]["i1:p1"]["status"],"correct")
        self.assertEqual(outcome["feedback"]["i1:p2"]["status"],"manual_review")
        with self.assertRaises(ValueError):family.submit_attempt({"id":"attempt-1","assignmentId":"a1","answers":{}})
        with family.connect() as db:
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("UPDATE family_attempts SET answers_json='{}' WHERE id='attempt-1'")
    def test_http_authoring_roundtrip(self):
        server=ThreadingHTTPServer(("127.0.0.1",0),family.Handler)
        worker=threading.Thread(target=server.serve_forever,daemon=True)
        worker.start()
        try:
            base="http://127.0.0.1:"+str(server.server_port)
            with urlopen(base+"/family-local.html") as response:
                self.assertIn(b"Family Space",response.read())
            with urlopen(base+"/family-local.js") as response:
                self.assertIn(b"Question Library",response.read())
            body=json.dumps(question()).encode()
            req=Request(base+"/api/questions",data=body,headers={"Content-Type":"application/json"},method="POST")
            with urlopen(req) as response:
                self.assertEqual(response.status,200)
            with urlopen(base+"/api/questions") as response:
                self.assertEqual(json.load(response)["data"][0]["id"],"q1")
        finally:
            server.shutdown()
            worker.join(timeout=5)

    def test_invalid_question_rejected(self):
        q=question();q["parts"][0]["kind"]="exec_sql"
        with self.assertRaises(ValueError):family.save_document("questions",q)

if __name__=="__main__":unittest.main()

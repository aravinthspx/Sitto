"""The scheduler can run as a background thread inside the API (free hosting)."""
import threading
from unittest.mock import patch

from app.config import Config


def test_gunicorn_hook_starts_scheduler_once(monkeypatch):
    import importlib.util, os, scheduler
    spec = importlib.util.spec_from_file_location(
        "gunicorn_conf", os.path.join(os.path.dirname(__file__), "..", "gunicorn.conf.py"))
    conf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conf)
    monkeypatch.setattr(Config, "RUN_SCHEDULER_IN_WEB", True)
    monkeypatch.setattr(scheduler, "_started", False)
    worker = type("W", (), {"log": type("L", (), {"info": staticmethod(lambda *a: None)})()})()
    with patch.object(scheduler, "_run_loop"), patch.object(scheduler, "_register_jobs") as register:
        conf.post_worker_init(worker)
        conf.post_worker_init(worker)
    assert register.call_count == 1
    assert conf.workers == 1  # a single process = a single scheduler


def test_creating_the_app_never_starts_the_scheduler(monkeypatch):
    # Regression: starting it during import left the gunicorn worker unresponsive
    import scheduler
    monkeypatch.setattr(Config, "RUN_SCHEDULER_IN_WEB", True)
    monkeypatch.setattr(scheduler, "_started", False)
    with patch.object(scheduler, "start_in_background") as start:
        from app import create_app
        create_app()
    start.assert_not_called()


def test_each_thread_gets_its_own_supabase_client(monkeypatch):
    # Regression: one HTTP/2 client shared by web and scheduler threads deadlocked
    from app.database import connection
    made = []
    monkeypatch.setattr(connection, "get_supabase_client", lambda: made.append(object()) or made[-1])
    proxy = connection._PerThreadClient()
    seen = {}

    def grab(name):
        seen[name] = (proxy._client(), proxy._client())

    threads = [threading.Thread(target=grab, args=(n,)) for n in ("web", "scheduler")]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert seen["web"][0] is seen["web"][1]          # reused within a thread
    assert seen["web"][0] is not seen["scheduler"][0]  # never shared across threads


def test_loop_survives_a_failing_job(monkeypatch):
    import scheduler
    calls = {"n": 0}

    def boom():
        calls["n"] += 1
        if calls["n"] >= 3:
            raise SystemExit  # stop the test loop
        raise RuntimeError("database down")

    monkeypatch.setattr(scheduler, "purge_expired_data", lambda: None)
    monkeypatch.setattr(scheduler.schedule, "run_pending", boom)
    monkeypatch.setattr(scheduler.time, "sleep", lambda s: None)
    try:
        scheduler._run_loop()
    except SystemExit:
        pass
    assert calls["n"] == 3  # kept running after the first two failures

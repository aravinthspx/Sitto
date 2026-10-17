"""The scheduler can run as a background thread inside the API (free hosting)."""
import threading
from unittest.mock import patch

from app.config import Config


def test_scheduler_thread_starts_once_inside_web(monkeypatch):
    import scheduler
    monkeypatch.setattr(Config, "RUN_SCHEDULER_IN_WEB", True)
    monkeypatch.setattr(Config, "DEBUG", False)
    monkeypatch.setattr(scheduler, "_started", False)
    with patch.object(scheduler, "_run_loop"), patch.object(scheduler, "_register_jobs") as register:
        from app import create_app
        create_app()
        create_app()  # e.g. a second import must not start a second scheduler
    assert register.call_count == 1


def test_scheduler_not_started_by_default(monkeypatch):
    import scheduler
    monkeypatch.setattr(Config, "RUN_SCHEDULER_IN_WEB", False)
    monkeypatch.setattr(scheduler, "_started", False)
    with patch.object(scheduler, "start_in_background") as start:
        from app import create_app
        create_app()
    start.assert_not_called()


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

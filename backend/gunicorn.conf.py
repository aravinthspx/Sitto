"""gunicorn settings for production (Render): `gunicorn -c gunicorn.conf.py run:app`."""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
# One process: keeps the in-memory rate limiter accurate and guarantees a single
# SeatSure scheduler; threads handle concurrent requests.
workers = 1
worker_class = "gthread"
threads = 8
timeout = 30
accesslog = "-"


def post_worker_init(worker):
    """Start the SeatSure scheduler once the worker is serving (free-plan mode).

    Starting it here, not while the app module is being imported, keeps the
    worker's startup free of background database traffic.
    """
    from app.config import Config
    if Config.RUN_SCHEDULER_IN_WEB:
        import scheduler
        scheduler.start_in_background()
        worker.log.info("SeatSure scheduler started inside the web worker")

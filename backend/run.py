"""Development entry point. In production run with gunicorn (see DEPLOYMENT.md):

    gunicorn -c gunicorn.conf.py run:app
"""
import os

from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    # Under gunicorn the scheduler is started by gunicorn.conf.py once the
    # worker is up. For `python run.py` start it here (only in the reloader's
    # serving process when debug is on).
    if Config.RUN_SCHEDULER_IN_WEB and (not Config.DEBUG or os.environ.get("WERKZEUG_RUN_MAIN") == "true"):
        import scheduler
        scheduler.start_in_background()

    # Debug (the interactive Werkzeug debugger) is only ever enabled when
    # APP_ENV=development AND FLASK_DEBUG=1 — it allows remote code execution.
    host = "0.0.0.0" if Config.IS_PRODUCTION else "127.0.0.1"
    app.run(host=host, port=int(os.environ.get("PORT", 5000)), debug=Config.DEBUG)

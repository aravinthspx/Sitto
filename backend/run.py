"""Development entry point. In production run with gunicorn (see DEPLOYMENT.md):

    gunicorn -w 4 -b 0.0.0.0:5000 run:app
"""
import os

from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    # Debug (the interactive Werkzeug debugger) is only ever enabled when
    # APP_ENV=development AND FLASK_DEBUG=1 — it allows remote code execution.
    host = "0.0.0.0" if Config.IS_PRODUCTION else "127.0.0.1"
    app.run(host=host, port=int(os.environ.get("PORT", 5000)), debug=Config.DEBUG)

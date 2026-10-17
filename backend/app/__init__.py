import logging

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.security import init_security


def create_app():
    app = Flask(__name__)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # Only the configured frontend origins may call the API from a browser.
    # Credentials are NOT used here; the frontend sends the JWT in Authorization header
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.ALLOWED_ORIGINS}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        max_age=600,
    )
    if Config.IS_PRODUCTION and not Config.ALLOWED_ORIGINS:
        logging.getLogger("sitto").warning(
            "ALLOWED_ORIGINS is empty — browsers on other origins cannot call the API."
        )

    init_security(app)

    from app.routes.auth import auth_bp
    from app.routes.campus import campus_bp
    from app.routes.reservations import reservations_bp
    from app.routes.seatsure import seatsure_bp
    from app.routes.admin import admin_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(campus_bp)
    app.register_blueprint(reservations_bp)
    app.register_blueprint(seatsure_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notifications_bp)

    @app.route('/health')
    def health():
        db_status = "connected"
        try:
            from app.database.connection import supabase
            if supabase is None:
                db_status = "not_configured"
            else:
                supabase.table("profiles").select("id").limit(1).execute()
        except Exception:
            db_status = "error"
        return jsonify({"status": "healthy", "database": db_status}), 200

    @app.route('/api')
    def api_root():
        return jsonify({"message": "Sitto API running"}), 200

    return app

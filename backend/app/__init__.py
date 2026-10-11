from flask import Flask, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    # Allow the Vite dev server and production origin
    # Credentials are NOT used here; the frontend sends the JWT in Authorization header
    CORS(app, origins="*", supports_credentials=False)

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
        except Exception as e:
            db_status = f"error"
        return jsonify({"status": "healthy", "database": db_status, "version": "1.0.0"}), 200

    @app.route('/api')
    def api_root():
        return jsonify({"message": "Sitto API running", "version": "1.0.0"}), 200

    return app

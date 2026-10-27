"""Application factory and Flask extensions."""
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy import event
from sqlalchemy.engine import Engine

from .config import Config
from .extensions import db


def create_app(config_object: object = Config) -> Flask:
    """Create the Flask application object."""
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)

    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        @event.listens_for(Engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    from .api import api_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.get("/")
    def root():
        return {"service": "smartroom-monitor", "status": "ok"}

    return app

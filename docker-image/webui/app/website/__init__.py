#!/usr/bin/python3
# IMPORT
import logging
import json
from flask import Flask, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

#VARIABLES
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    #  Import url handlers
    from .routes import routes    
    app.register_blueprint(routes, url_prefix='/')  
    return app
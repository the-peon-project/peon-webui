from . import db # Get the 'db' object from the __init.py__
from flask_login import UserMixin
from sqlalchemy.sql import func

# DB Table definifion
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150))
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    creation_date = db.Column(db.DateTime(timezone=True), default=func.now())
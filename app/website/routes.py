#!/usr/bin/python3
# IMPORT
import inspect
from flask import Blueprint,render_template # Blueprint is a module for neatening up app routes
from flask_login import login_required, current_user

# VARIABLES
routes = Blueprint('routes', __name__) # Define a blueprint for views
# APP ROUTES (URLs)
@routes.route('/') # Decorator
def home():
    return render_template("home.html", user=current_user)
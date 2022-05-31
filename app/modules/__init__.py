import json
import os
import logging

project_path = "/".join(((os.path.dirname(__file__)).split("/"))[:-1])

# Settings file
settings = json.load(open(f"{project_path}/settings.json", 'r'))
# Container prefix
prefix = "peon.warcamp."

def devMode():
    if os.path.isdir(f"{project_path}/dev"):
        logging.info("DEV MODE ENABLED")
        return True
    else:
        return False

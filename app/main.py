#!/usr/bin/python3
# IMPORTS
import logging
from website import create_app

# VARIABLES
app = create_app()

# MAIN
if __name__ == '__main__':
    logging.basicConfig(filename='/var/log/peon/webui.log', filemode='a', format='%(asctime)s %(thread)d [%(levelname)s] - %(message)s', level=logging.INFO)
    app.run(host='0.0.0.0',port=80, debug=True)
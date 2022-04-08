# Base image uvicorn gunicorn fastapi - prebuilt high speed flask
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9
# Build information
LABEL "com.peon.description"="Peon Web UI"
LABEL "maintainer"="Umlatt <richard@noxnoctua.com>"
# Install python requirements
COPY ./requirements.txt /app/requirements.txt
# Update pip and install required python modules
RUN /usr/local/bin/python -m pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt
# Copy application files into container
COPY ./app /app
# Move to working directory
WORKDIR /app
# Start application
CMD ["/bin/sh", "-c","python3 main.py >> /var/log/peon/webui.log 2>&1"]
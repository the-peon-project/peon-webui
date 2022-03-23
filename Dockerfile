# Base image uvicorn gunicorn fastapi - prebuilt high speed flask
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9
# Install python requirements
COPY ./requirements.txt /app/requirements.txt
# Update pip and install required python modules
RUN /usr/local/bin/python -m pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt
# Copy application files into container
COPY ./app /app
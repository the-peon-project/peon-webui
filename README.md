# PEON - Web UI

![PEON](https://github.com/the-peon-project/peon/blob/main/media/andre-kent-peon-turntable.jpeg)
Art by [André Kent - Artstation](https://www.artstation.com/artwork/W2E0RQ)
**This project owns no rights to the image above. Please link to the site and request them accordingly.**

[![Docker Pulls](https://img.shields.io/docker/pulls/umlatt/peon.ui.svg)](https://hub.docker.com/r/umlatt/peon.ui)
[![Docker Stars](https://img.shields.io/docker/stars/umlatt/peon.ui.svg)](https://hub.docker.com/r/umlatt/peon.ui)

## The Easy Game Server Manager

### Installation

> Please find the installation instructions at [PEON](https://github.com/the-peon-project/peon/) master project, as there are several dependencies that are required for this module to work correctly.

### [Peon Project](https://github.com/the-peon-project/peon)

An **OpenSource** project to assist gamers in self-deploying/managing game servers.\
Intended to be a one-stop-shop for game server deployment/management.\
If run on a public/paid cloud, it is architected to try to minimise costs (easy schedule/manage uptime vs downtime)\

### Peon WebUI (peon.webui)

The [github](https://github.com/the-peon-project/peon-webui) repo for developing the peon web user interface.

## State

> **EARLY DEVELOPMENT**

Completely useless at this point

## Version Info

Check [changelog](https://github.com/the-peon-project/peon-webui/blob/master/changelog.md) for more information

- Deployed with ``tiangolo/uvicorn-gunicorn-fastapi:python3.9`` as a base image
- Simple basic homepage with ``darkly`` bootswatch theme applied

### Known Bugs

### Architecture/Rules

WebUI (PeonUI) built into docker image using flask as a base.

Flask provided by [tiangolo/uvicorn-gunicorn-fastapi-docker](https://github.com/tiangolo/uvicorn-gunicorn-fastapi-docker)\
Bootstrap provided by [bootswatch/darkly](https://bootswatch.com/darkly/)\
Postgres provided by [postgres:14-alpine](https://hub.docker.com/_/postgres)

### Feature Plan

#### *sprint 0.1.0*

- [ ] WebUI - Access controlled webpage for management
- [x] Deploy and delete games from a recipe catalogue (hosted here)
- [ ] Start/stop servers with timeouts (e.g. specify a game session to run for 6 hours (with the option to extend))

#### *sprint 0.2.0*

- [x] Recipes - Autodetect newly added recipies.
- [ ] Persistent server data - Keep server data for updates & future releases.

#### Notes

[Flask app example](https://ianlondon.github.io/blog/deploy-flask-docker-nginx/)

## Support the Project

PEON is an open-source project that I am working on in my spare time (for fun).
However, if you still wish to say thanks, feel free to pick up a virtual coffee for me at Ko-fi.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K567ILJ)


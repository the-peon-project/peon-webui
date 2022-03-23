# PEON - Web UI
## The Easy Game Server Manager

### [Peon Project](https://github.com/nox-noctua-consulting/peon)
An **OpenSource** project to assist gamers in self deploying/managing game servers.\
Intended to be a one-stop-shop for game server deployment/management.\
If run on a public/paid cloud, it is architected to try minimise costs (easy schedule/manage uptime vs downtime)\

### Peon WebUI (peon.ui)

The [github](https://github.com/nox-noctua-consulting/peon-ui) repo for developing the peon web user interface.

## State

> **EARLY DEVELOPMENT**

Completely useless at this point

## Version Info

### 0.1.1-dev
- Deployed with ``tiangolo/uvicorn-gunicorn-fastapi:python3.9`` as base image
- Simple basic homepage with ``darkly`` bootswatch theme applied
#### Known Bugs
- [ ] Internal server error

### Architecture/Rules

WebUI (PeonUI) built into docker image using flask as base.

Flask provided by [tiangolo/uvicorn-gunicorn-fastapi-docker](https://github.com/tiangolo/uvicorn-gunicorn-fastapi-docker)\
Bootstrap provided by [bootswatch/darkly](https://bootswatch.com/darkly/)\
Postgres provided by [postgres:14-alpine](https://hub.docker.com/_/postgres)

### Feature Plan

#### *sprint 1.0.0*

- [ ] WebUI - Access controlled webpage for management
- [ ] Deploy and delete games from a recipe catalgue (hosted here)
- [ ] Start/stop servers with timeouts (e.g. specify a game session to run for 6 hours (with option to extend))

#### *sprint 2.0.0*

- [ ] Recipes - Autodetect newly added recipies.
- [ ] Persistent server data - Keep server data for updates & future releases.

#### Notes

[Flask app example](https://ianlondon.github.io/blog/deploy-flask-docker-nginx/)
# PEON - Web UI

![André Kent - Artstation](https://cdna.artstation.com/p/assets/images/images/023/913/316/large/andre-kent-peon-turntable.jpg)

## The Easy Game Server Manager

### [Peon Project](https://github.com/nox-noctua-consulting/peon)

An **OpenSource** project to assist gamers in self-deploying/managing game servers.\
Intended to be a one-stop-shop for game server deployment/management.\
If run on a public/paid cloud, it is architected to try to minimise costs (easy schedule/manage uptime vs downtime)\

### Peon WebUI (peon.ui)

The [github](https://github.com/nox-noctua-consulting/peon-ui) repo for developing the peon web user interface.

## State

> **EARLY DEVELOPMENT**

Completely useless at this point

## Version Info

Check [changelog](https://github.com/nox-noctua-consulting/peon-ui/blob/master/changelog.md) for more information

- Deployed with ``tiangolo/uvicorn-gunicorn-fastapi:python3.9`` as a base image
- Simple basic homepage with ``darkly`` bootswatch theme applied

#### Known Bugs

### Architecture/Rules

WebUI (PeonUI) built into docker image using flask as a base.

Flask provided by [tiangolo/uvicorn-gunicorn-fastapi-docker](https://github.com/tiangolo/uvicorn-gunicorn-fastapi-docker)\
Bootstrap provided by [bootswatch/darkly](https://bootswatch.com/darkly/)\
Postgres provided by [postgres:14-alpine](https://hub.docker.com/_/postgres)

### Feature Plan

#### *sprint 0.1.0*

- [ ] WebUI - Access controlled webpage for management
- [ ] Deploy and delete games from a recipe catalogue (hosted here)
- [ ] Start/stop servers with timeouts (e.g. specify a game session to run for 6 hours (with the option to extend))

#### *sprint 0.2.0*

- [ ] Recipes - Autodetect newly added recipies.
- [ ] Persistent server data - Keep server data for updates & future releases.

#### Notes

[Flask app example](https://ianlondon.github.io/blog/deploy-flask-docker-nginx/)

## Support the Project

This is an open source project and I am doing it, in my spare time, for fun.\
However, if you really wish to say thank you, feel free to pick up a virtual coffee for me at Ko-fi.

[Ko-fi](https://ko-fi.com/umlatt47309)

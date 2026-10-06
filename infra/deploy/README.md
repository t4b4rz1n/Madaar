# Heledone production domains

- Frontend: `https://panel.heledone.com`
- Backend: `https://api.heledone.com` (REST endpoints under `/api/v1/`)
- Django admin: `https://api.heledone.com/admin/`
- Public media: `https://api.heledone.com/storage/madar-media/`

ArvanCloud terminates HTTPS. Both CDN records must use origin
`212.80.22.175`, **HTTP**, port **80**. The server does not terminate TLS.

## Repository configuration

The web production environment and Docker publishing workflow use the API domain.
For a source build with the root Docker Compose file, merge
`.env.production.example` into the existing root environment. Merge the domain
settings in `apps/api/.env.production.example` into the existing API environment;
it is an overlay, not a complete replacement. Preserve database credentials,
`SECRET_KEY`, S3 credentials, the Compose project name and all volume names.

`infra/docker/nginx/heledone.conf` belongs inside the shared Nginx `http` block.
The shared webserver must join the external `madar_network`. This file uses
Docker DNS at request time so API/web container updates do not leave stale IPs.
Legacy routes using the same `madar-api` or `madar-web` hostnames must also use
variable `proxy_pass` directives. A static upstream for the same hostname can
shadow variable-based DNS resolution and keep an old container address. The
server's existing `madaar.movazee.com` compatibility routes were updated too.
The media proxy permits reads from the existing bucket. Collected Django static
files are served through the web container's `/api-static/` location; mount an
export of the API image's `/app/staticfiles` at `/srv/api-static:ro` in the web
container and refresh the export after backend releases that change static files.

Keep `SECURE_SSL_REDIRECT=False` at the HTTP origin. Secure cookies are enabled,
and `TRUST_PROXY_PROTO=True` lets Django recognize HTTPS forwarded by the CDN.
Only enable that setting behind a trusted proxy. The panel origin is explicitly
allowed by CORS, including credentials, because Axios sends credentialed requests.

## Server deployment on 2026-10-06

The server uses `/root/madaar/compose.yaml` with Compose project `madaar`; its
data volumes are `madaar_postgres_data` and `madaar_minio_data`. This differs from
the development Compose file. Do not replace the server file with the development
file or change the existing volume names.

The deployment preserved the newer installed application version. Domain changes
were layered on the installed images, rather than deploying an older local
checkout. The selected images are:

```text
madaar-api:heledone-20261006T074936Z
madaar-web:heledone-20261006T074936Z
```

Initially, Watchtower was disabled for this project's four application containers so previous
registry images cannot overwrite the changes. Other projects' updater settings
were unchanged. After publishing the repository changes to GHCR, switch back to
the corresponding registry images, refresh the static export and re-enable this
project's Watchtower labels if automatic updates are desired.

Backups (configuration, PostgreSQL custom-format dump, container/mount identities
and table counts) are stored at:

```text
/root/madaar/backups/heledone-20261006T074936Z
```

The prepared images and deployment manifest are in
`/root/madaar/domain-deploy/20261006T074936Z`. Previous images also have
`before-heledone-20261006T074936Z` tags for rollback.

Read-only deployment verification and an explicit rollback script are saved as
`/root/madaar/domain-deploy/scripts/verify.py` and
`/root/madaar/domain-deploy/scripts/rollback.py`. The rollback script restores
the previous application images and edge configuration, without restoring the
database dump over live data or touching storage volumes.

The deployment only recreates `api`, `worker`, `beat` and `web`:

```sh
docker compose -p madaar -f /root/madaar/compose.yaml up -d --no-deps --pull never api worker beat web
docker exec webserver nginx -t
docker exec webserver nginx -s reload
```

It does not run `down`, remove volumes or recreate database/storage containers.
The shared Compose network change is saved for future webserver recreation;
the running shared Nginx already belongs to that network and only needs a reload.

## Registry rollout on 2026-10-06

After explicit approval, the four application services were switched back to
`ghcr.io/t4b4rz1n/madaar-api:main` and `ghcr.io/t4b4rz1n/madaar-web:main`, both
at Git revision `2a497b1c7044695d3c39d3428a8fd6f59c845732`. Watchtower is now
enabled again for these four services. The static export was refreshed from the
published API image. Database/storage containers and all 48 table row counts
were preserved.

The additional pre-rollout backup is
`/root/madaar/backups/registry-20261006T083651Z`. It contains the previous Compose
file, the PostgreSQL dump and static files, and the checked registry Compose
candidate. The previous temporary images remain available for rollback.
To return to the pre-registry application without restoring live data, run
`python3 /root/madaar/backups/registry-20261006T083651Z/rollback.py`.

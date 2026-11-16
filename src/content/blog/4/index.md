---
title: 'Zero-Downtime Django Deploys with Docker Compose'
seoTitle: 'Zero-Downtime Django Deployments with Docker Compose and Nginx (No Kubernetes)'
slug: 'zero-downtime-django-deploys-docker-compose'
description: 'Ship a new Django image without a single 502: start the new container next to the old one, wait for its healthcheck, then retire the old one — with automatic rollback, using only Docker Compose and Nginx.'
pubDate: '2026-11-16'
updatedDate: '2026-11-16'
tags: ['Django', 'Docker', 'Nginx', 'DevOps']
coverImage: '4.jpg'
translationKey: 'zero-downtime-compose'
---

If you deploy Django with Docker Compose, your deploy script probably ends with something like this:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate django
```

It works, but there is a gap. Compose stops the old container first and only then starts the new one. For the few seconds it takes Django to boot, Nginx has nothing to talk to and every visitor gets a **502 Bad Gateway**. Worse, if the new image is broken — a missing environment variable, an import error — the old container is already gone. There is nothing to fall back to.

You don't need Kubernetes to fix this. With a healthcheck, one Compose flag and a small Nginx change you can get a rolling deploy with automatic rollback on a single server.

---

## The Idea

Instead of *replace*, we do *add, verify, remove*:

1. Start a **second** copy of the service next to the running one.
2. Wait until Docker reports the new copy as `healthy`.
3. If it never becomes healthy, delete it. The old copy never stopped, so users notice nothing — that is the rollback.
4. If it is healthy, give Nginx a moment to see it, then stop the old copy gracefully.

At every point in time at least one healthy copy is serving traffic.

---

## 1. Prepare the Compose Service

Two things in a typical Compose file block a second copy from starting:

- `container_name:` — container names must be unique.
- `ports: ["8000:8000"]` — two containers can't bind the same host port.

Remove both. Nginx reaches Django over the Compose network by service name, so a host port isn't needed anyway. Then add a healthcheck and a grace period:

```yaml
services:
  django:
    image: myapp/django:latest
    command: >
      uvicorn config.asgi:application --host 0.0.0.0 --port 8000
      --timeout-graceful-shutdown 30
    stop_grace_period: 40s
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import socket; socket.create_connection(('127.0.0.1', 8000), timeout=4)\""]
      interval: 5s
      timeout: 6s
      retries: 6
      start_period: 40s
```

A few notes:

- **The healthcheck is a plain TCP connect.** Uvicorn (and Gunicorn) only open the port after the application has loaded, so "accepts connections" already means "ready". An HTTP check would also work, but it can trip over `ALLOWED_HOSTS` or authentication.
- **`interval: 5s` matters.** The deploy waits for `healthy`; with Docker's default 30 seconds every deploy would sit idle for half a minute.
- **`stop_grace_period: 40s`** gives the old container time to finish in-flight requests. Docker's default of 10 seconds sends `SIGKILL` to requests still running.

---

## 2. Make Nginx Follow the Containers

This is the part most guides miss. A classic Nginx config looks like this:

```nginx
upstream django {
    server django:8000;
}

location / {
    proxy_pass http://django;
}
```

Nginx resolves `django` **once**, at startup or reload, and keeps that IP forever. When the container is recreated it gets a new IP, and Nginx keeps sending traffic to the old one. It also never notices the second copy.

The fix is to use Docker's internal DNS server and put the address in a **variable**. When `proxy_pass` contains a variable, Nginx resolves the name at request time and respects the `valid=` TTL:

```nginx
resolver 127.0.0.11 valid=2s ipv6=off;

server {
    location / {
        set $django_upstream http://django:8000;
        proxy_pass $django_upstream;

        proxy_connect_timeout 2s;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 20s;
    }
}
```

`127.0.0.11` is Docker's embedded DNS. When two copies of `django` are running, the name resolves to both IPs and Nginx spreads requests across them.

The `proxy_next_upstream` lines cover the edges of the switch. For up to two seconds a stopped container can still be in Nginx's DNS cache, and a fresh one can appear in DNS a moment before its port is open. A request that hits a closed port fails fast thanks to `proxy_connect_timeout 2s`, and Nginx retries it on the other copy instead of returning a 502.

> Don't keep a static `upstream { server django:8000; }` block "just in case". Nginx resolves it at reload time, and if the container doesn't exist at that moment `nginx -t` rejects the whole configuration.

---

## 3. The Rollout Function

With the groundwork done, the deploy step is a short Bash function. It scales the service up by one, finds the container that just appeared, waits for its health status and then removes the old containers:

```bash
COMPOSE="docker compose -f docker-compose.prod.yml"
HEALTH_TIMEOUT=180
DNS_SETTLE=3   # nginx resolver valid=2s + 1

health() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$1" 2>/dev/null || echo none
}

wait_healthy() {
  local id="$1" waited=0
  while :; do
    case "$(health "$id")" in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    [ "$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null)" = "true" ] || return 1
    [ "$waited" -ge "$HEALTH_TIMEOUT" ] && return 1
    sleep 2; waited=$((waited + 2))
  done
}

rollout() {
  local svc="$1" grace="$2" old new count id
  old=$($COMPOSE ps -q "$svc")
  count=$(printf '%s\n' "$old" | grep -c .)

  $COMPOSE up -d --no-deps --no-recreate --scale "$svc=$((count + 1))" "$svc" || return 1
  new=$(comm -13 <(printf '%s\n' "$old" | sort) <($COMPOSE ps -q "$svc" | sort))
  [ -n "$new" ] || return 1

  for id in $new; do
    if ! wait_healthy "$id"; then
      echo "new $svc is not healthy, rolling back"
      docker logs --tail 40 "$id"
      docker rm -f "$id" >/dev/null
      return 1
    fi
  done

  sleep "$DNS_SETTLE"
  for id in $old; do
    docker stop -t "$grace" "$id" >/dev/null
    docker rm -f "$id" >/dev/null
  done
}
```

The important flags:

- **`--scale django=2`** starts one extra copy.
- **`--no-recreate`** tells Compose not to touch the copy that is already running, even though its image is outdated.
- **`--no-deps`** keeps Compose from restarting the database or Redis along the way.
- **`comm -13`** compares the container IDs before and after, so we know exactly which container is new.

In the deploy script it's used like this:

```bash
docker compose -f docker-compose.prod.yml build django
docker compose -f docker-compose.prod.yml run --rm django python manage.py migrate --noinput

if ! rollout django 40; then
  echo "Deploy failed: the old version is still serving traffic."
  exit 1
fi
```

If the new image crashes on startup, the script prints its last log lines, deletes it and exits — while the previous version keeps answering requests. No manual rollback, no outage.

---

## 4. The Migration Rule

There is one thing this setup changes about how you write code. Migrations run **before** the switch, so for a short time the **old** code runs against the **new** schema. Every migration must therefore be backwards compatible:

- **Adding a column:** make it nullable or give it a default. Old code doesn't know about it and inserts rows without it.
- **Removing a column:** do it in two deploys. First ship code that no longer uses the field, then drop it in the next release.
- **Renaming:** treat it as add new, copy data, switch code, remove old, again across two deploys.

This is the same discipline any zero-downtime system needs, Kubernetes included. Compose doesn't make it harder; it just makes it visible.

---

## Wrapping Up

With a healthcheck, `--scale` with `--no-recreate`, and an Nginx config that resolves names at request time, a single-server Docker Compose setup gets the two things that usually push people towards an orchestrator: **no downtime during deploys** and **automatic rollback when an image is broken**. The whole thing is about sixty lines of Bash.

The same `rollout` function works for any stateless HTTP service in the stack. I use it for the frontend container as well, always rolling out the backend first so the new frontend never talks to the old API.

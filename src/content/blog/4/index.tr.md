---
title: 'Docker Compose ile Kesintisiz Django Yayını'
seoTitle: 'Docker Compose ve Nginx ile Kesintisiz Django Deploy (Kubernetes’siz)'
slug: 'docker-compose-ile-kesintisiz-django-yayini'
description: 'Yeni Django imajını tek bir 502 bile vermeden yayına alın: yeni konteyneri eskisinin yanında açın, healthcheck’ini bekleyin, sonra eskisini kapatın. Kendiliğinden geri alma dahil, yalnızca Docker Compose ve Nginx ile.'
pubDate: '2026-11-16'
updatedDate: '2026-11-16'
tags: ['Django', 'Docker', 'Nginx', 'DevOps']
coverImage: '4.jpg'
lang: 'tr'
translationKey: 'zero-downtime-compose'
---

Django’yu Docker Compose ile yayınlıyorsanız deploy betiğiniz büyük ihtimalle şuna benzer bir satırla bitiyordur:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate django
```

Çalışır, ama arada bir boşluk var. Compose önce eski konteyneri durdurur, yenisini ancak ondan sonra açar. Django’nun açılması için geçen birkaç saniye boyunca Nginx’in konuşacağı kimse yoktur ve her ziyaretçi **502 Bad Gateway** görür. Daha kötüsü, yeni imaj bozuksa (eksik bir ortam değişkeni, bir import hatası) eski konteyner çoktan gitmiştir. Geri dönecek bir şey kalmaz.

Bunu çözmek için Kubernetes gerekmiyor. Bir healthcheck, tek bir Compose bayrağı ve Nginx’te küçük bir değişiklikle, tek sunucuda, kendiliğinden geri alan kademeli bir yayın elde edebilirsiniz.

---

## Fikir

*Değiştir* yerine *ekle, doğrula, kaldır* yapıyoruz:

1. Çalışan servisin **yanında ikinci bir kopya** açılır.
2. Docker yeni kopyayı `healthy` olarak gösterene kadar beklenir.
3. Hiç sağlıklı olmazsa silinir. Eski kopya hiç durmadığı için kullanıcılar bir şey fark etmez; geri alma budur.
4. Sağlıklıysa Nginx’in onu görmesi için kısa bir süre beklenir, sonra eski kopya düzgünce kapatılır.

Her an en az bir sağlıklı kopya trafiğe cevap veriyor.

---

## 1. Compose Servisini Hazırlamak

Tipik bir Compose dosyasında iki şey ikinci kopyanın açılmasını engeller:

- `container_name:`: konteyner adları benzersiz olmak zorunda.
- `ports: ["8000:8000"]`: iki konteyner aynı host portuna bağlanamaz.

İkisini de kaldırın. Nginx, Django’ya Compose ağı üzerinden servis adıyla ulaşır; host portuna zaten ihtiyaç yok. Ardından bir healthcheck ve kapanma süresi ekleyin:

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

Birkaç not:

- **Healthcheck düz bir TCP bağlantısı.** Uvicorn (ve Gunicorn) portu uygulama yüklendikten sonra açar; yani “bağlantı kabul ediyor” zaten “hazır” demek. HTTP kontrolü de olur ama `ALLOWED_HOSTS`’a ya da kimlik doğrulamaya takılabilir.
- **`interval: 5s` önemli.** Deploy `healthy` durumunu bekliyor; Docker’ın varsayılanı olan 30 saniyeyle her yayın yarım dakika boşuna beklerdi.
- **`stop_grace_period: 40s`** eski konteynere elindeki istekleri bitirme süresi verir. Docker’ın varsayılan 10 saniyesi, hâlâ süren isteklere `SIGKILL` gönderir.

---

## 2. Nginx’in Konteynerleri Takip Etmesi

Çoğu rehberin atladığı kısım bu. Klasik bir Nginx ayarı şöyledir:

```nginx
upstream django {
    server django:8000;
}

location / {
    proxy_pass http://django;
}
```

Nginx `django` adını açılışta ya da reload’da **bir kez** çözer ve o IP’yi sonsuza kadar kullanır. Konteyner yeniden oluşturulunca yeni bir IP alır, Nginx ise trafiği eski IP’ye göndermeye devam eder. İkinci kopyayı da hiç fark etmez.

Çözüm, Docker’ın iç DNS sunucusunu kullanmak ve adresi bir **değişkene** koymak. `proxy_pass` içinde değişken varsa Nginx adı her istekte çözer ve `valid=` süresine uyar:

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

`127.0.0.11`, Docker’ın gömülü DNS sunucusu. İki `django` kopyası çalışırken ad iki IP’ye birden çözülür ve Nginx istekleri ikisine dağıtır.

`proxy_next_upstream` satırları geçişin kenarlarını kapatıyor. Kapanmış bir konteyner iki saniye boyunca Nginx’in DNS önbelleğinde kalabilir, yeni bir konteyner de portu açılmadan bir an önce DNS’te görünebilir. Kapalı porta düşen istek `proxy_connect_timeout 2s` sayesinde hızlıca hata verir ve Nginx 502 döndürmek yerine isteği öteki kopyada tekrar dener.

> “Ne olur ne olmaz” diye sabit bir `upstream { server django:8000; }` bloğu bırakmayın. Nginx onu reload anında çözer; konteyner o an yoksa `nginx -t` bütün ayarı reddeder.

---

## 3. Rollout Fonksiyonu

Altyapı hazır olunca deploy adımı kısa bir Bash fonksiyonuna iniyor. Servisi bir kopya büyütüyor, yeni açılan konteyneri buluyor, sağlık durumunu bekliyor ve eski konteynerleri kaldırıyor:

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

Önemli bayraklar:

- **`--scale django=2`** bir kopya fazladan açar.
- **`--no-recreate`** Compose’a, imajı eskimiş olsa da çalışan kopyaya dokunmamasını söyler.
- **`--no-deps`** Compose’un bu sırada veritabanını ya da Redis’i yeniden başlatmasını engeller.
- **`comm -13`** önceki ve sonraki konteyner kimliklerini karşılaştırır; böylece hangisinin yeni olduğunu tam olarak biliriz.

Deploy betiğinde şöyle kullanılıyor:

```bash
docker compose -f docker-compose.prod.yml build django
docker compose -f docker-compose.prod.yml run --rm django python manage.py migrate --noinput

if ! rollout django 40; then
  echo "Deploy failed: the old version is still serving traffic."
  exit 1
fi
```

Yeni imaj açılışta çökerse betik son log satırlarını basar, yeni konteyneri siler ve çıkar; önceki sürüm ise isteklere cevap vermeye devam eder. Elle geri alma yok, kesinti yok.

---

## 4. Migration Kuralı

Bu düzen kod yazma biçiminizde tek bir şeyi değiştiriyor. Migration’lar geçişten **önce** koşar; yani kısa bir süre **eski** kod **yeni** şemayla çalışır. Bu yüzden her migration geriye dönük uyumlu olmalı:

- **Kolon eklemek:** null’a açık olsun ya da varsayılan değeri olsun. Eski kod bu kolonu bilmez ve satırları onsuz ekler.
- **Kolon silmek:** iki yayına bölün. Önce alanı artık kullanmayan kodu yayınlayın, alanı bir sonraki sürümde silin.
- **Ad değiştirmek:** yeniyi ekle, veriyi kopyala, kodu çevir, eskiyi sil; yine iki yayına yayarak.

Kubernetes dahil, kesintisiz çalışan her sistem bu disipline ihtiyaç duyar. Compose bunu zorlaştırmıyor, sadece görünür kılıyor.

---

## Sonuç

Bir healthcheck, `--no-recreate` ile `--scale` ve adları istek anında çözen bir Nginx ayarıyla tek sunuculu bir Docker Compose kurulumu, insanları genelde bir orkestratöre iten iki şeye kavuşuyor: **yayın sırasında kesinti yok** ve **imaj bozuksa kendiliğinden geri alma**. Bütün iş altmış satır kadar Bash.

Aynı `rollout` fonksiyonu yığındaki her durumsuz HTTP servisi için çalışıyor. Ben ön yüz konteynerinde de kullanıyorum; önce hep backend’i geçiriyorum ki yeni ön yüz hiçbir zaman eski API’ye düşmesin.

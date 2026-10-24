# Clear disk space (fix "No space left on device")

When version upload fails with **No space left on device** or Docker **input/output error**, free space as follows.

## 1. Docker (usually the biggest)

```bash
# Remove stopped containers, unused images, build cache
docker system prune -a -f

# Optional: also remove unused volumes (only if you don't need existing volume data)
docker volume prune -f
```

## 2. Uploaded app image tars (this project)

Stored under `control-panel-api/data/app_images/`. Deleting this removes all uploaded .tar files; you can re-upload later.

```bash
cd control-panel-api
rm -rf data/app_images/*
# Or remove the whole app_images tree
rm -rf data/app_images
```

## 3. Check free space

```bash
df -h .
docker system df
```

After freeing space, try the version upload again.

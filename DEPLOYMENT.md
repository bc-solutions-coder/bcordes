# Deployment Guide

This guide covers deploying your personal site to your server using Docker, GitHub Container Registry, and Portainer.

## Architecture Overview

1. **Local Development**: Work on features locally using `pnpm dev`
2. **Push to GitHub**: Push changes to `main` branch
3. **GitHub Actions**: Automatically builds Docker image and pushes to GitHub Container Registry (GHCR)
4. **Portainer**: Pulls the latest image from GHCR and deploys to your server

## Setup Steps

### 1. Enable GitHub Container Registry

GitHub Container Registry (GHCR) is enabled by default. Your images will be pushed to:
```
ghcr.io/susp3nse/bcordes:latest
```

### 2. Configure GitHub Repository

No additional configuration needed! The workflow uses the built-in `GITHUB_TOKEN` which has permission to write to GHCR.

**Optional**: Make the package public (by default it's private)
1. Go to your repository on GitHub
2. Click on "Packages" in the right sidebar
3. Click on the `bcordes` package
4. Go to "Package settings"
5. Under "Danger Zone", change visibility to Public (optional)

### 3. Deploy to Your Server via Portainer

#### Option A: Using Portainer Stacks (Recommended)

1. **Login to Portainer** on your server
2. **Navigate to Stacks** → Add Stack
3. **Name your stack**: `bcordes`
4. **Build method**: Choose "Repository" or "Web editor"

   **If using Repository:**
   - Repository URL: `https://github.com/Susp3nse/bcordes`
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.prod.yml`

   **If using Web editor:**
   - Copy the contents of `docker-compose.prod.yml`
   - Paste into the editor

5. **Environment variables** (if using database):
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

6. **Enable auto-update** (optional):
   - Enable "Auto-update" in stack settings
   - Set check interval (e.g., every 5 minutes)
   - Portainer will automatically pull new images

7. Click **Deploy the stack**

#### Option B: Manual Webhook Setup for Auto-Deploy

1. **Create a Portainer webhook**:
   - Go to your stack → click on the stack name
   - Scroll to "Webhooks" section
   - Create a new webhook
   - Copy the webhook URL

2. **Add webhook to GitHub repository**:
   - Go to your GitHub repository
   - Settings → Webhooks → Add webhook
   - Payload URL: Your Portainer webhook URL
   - Content type: `application/json`
   - Trigger: Select "Packages" events
   - Active: ✓
   - Save

Now whenever a new image is pushed, Portainer will automatically redeploy!

### 4. Pulling Images from GHCR

If your image is private, you'll need to authenticate:

1. **Create a GitHub Personal Access Token**:
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token
   - Scopes: `read:packages`
   - Copy the token

2. **Add registry credentials in Portainer**:
   - Portainer → Registries → Add registry
   - Name: `GitHub Container Registry`
   - Registry URL: `ghcr.io`
   - Authentication: ✓
   - Username: Your GitHub username
   - Password: Your Personal Access Token
   - Save

## Release Workflow

### For Development (Continuous Deployment)

Push to main branch:
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

This will trigger a build and push an image tagged with:
- `latest`
- `main-<git-sha>`

### For Production Releases (Versioned Deployment)

Create a version tag:
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will create images tagged with:
- `v1.0.0` (full version)
- `v1.0` (minor version)
- `v1` (major version)
- `latest`

You can then update your `docker-compose.prod.yml` to pin to a specific version:
```yaml
services:
  web:
    image: ghcr.io/susp3nse/bcordes:v1.0.0  # Pin to specific version
```

## Portainer Stack Management

### Update to Latest Version
```bash
# In Portainer, click "Pull and redeploy"
# Or via CLI on your server:
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### View Logs
In Portainer:
- Stacks → bcordes → Click on container → Logs

Or via CLI:
```bash
docker logs -f bcordes
```

### Rollback to Previous Version
```yaml
# Edit stack and change image tag to previous version
image: ghcr.io/susp3nse/bcordes:v0.9.0
```

## Environment Variables

Add these to your stack in Portainer:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Only if using database |
| `PORT` | Port to run on (default: 3000) | No |

## Database Setup (Optional)

If you need a database, uncomment the `db` service in `docker-compose.prod.yml`:

1. Set a secure `DB_PASSWORD` environment variable
2. Update `DATABASE_URL` in the web service:
   ```
   DATABASE_URL=postgresql://personalsite:yourpassword@db:5432/personalsite
   ```
3. Run migrations (one-time):
   ```bash
   # SSH into your server
   docker exec -it bcordes pnpm db:migrate
   ```

## Troubleshooting

### Container fails to start
- Check logs: `docker logs bcordes`
- Verify environment variables are set
- Ensure port 3000 is not already in use

### Image not found
- Check if GitHub Actions workflow completed successfully
- Verify registry authentication in Portainer
- Ensure package is public or credentials are configured

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check if database container is running
- Ensure network connectivity between containers

## Local Testing of Production Build

Test the production Docker image locally before deploying:

```bash
# Build production image
docker build -t bcordes:local .

# Run it
docker run -p 3000:3000 -e NODE_ENV=production bcordes:local

# Or use docker-compose
docker-compose up
```

Visit http://localhost:3000 to verify.

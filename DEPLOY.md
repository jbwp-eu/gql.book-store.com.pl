# Deployment

Production deploy: **single EC2** + **Caddy** + **GitHub Actions**.

| Version | Guide | Workflow |
|---------|--------|----------|
| **v1** | [deploy/README.md](deploy/README.md) — optional CLI scripts, `deploy` user + separate deploy key | [deploy-ec2.yml](.github/workflows/deploy-ec2.yml) |
| **v2** | [deploy-ver.2/README.md](deploy-ver.2/README.md) — AWS/GitHub Console only, single `ubuntu` + EC2 `.pem` | [deploy-ec2-v2.yml](.github/workflows/deploy-ec2-v2.yml) |

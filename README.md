# Cloud Cost Optimization

Cloud cost optimization SaaS MVP.

## MVP goals
- AWS account onboarding using a read-only cross-account IAM role
- AWS cost dashboard
- Resource inventory
- Optimization recommendations
- Estimated monthly savings
- Approval workflow before any future automated action

## Stack
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- Local development: Docker Compose
- Cloud integration: AWS SDK (boto3)
- Infrastructure: Terraform (planned)

## Run locally

```bash
docker compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API docs: http://localhost:8000/docs
PostgreSQL: localhost:5432

> AWS mutations are intentionally not implemented in the MVP. Initial AWS access is read-only.

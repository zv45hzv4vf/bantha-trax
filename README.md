# Bantha Trax

Multi-user collectible figure inventory and purchase-cost tracker designed for Railway + PostgreSQL.

## Included
- Account registration and login
- Strict per-account figure and transaction isolation
- Figure name, description/variant/condition
- Recommended buy and retail prices
- Every purchase stored separately
- Quantity tracking
- Base price + tax + shipping + other cost
- Average landed acquisition cost per figure
- Total invested per figure
- Mobile-friendly web UI
- Railway health check

## Railway deployment
1. Upload this project to a GitHub repository.
2. In Railway, create a project and deploy from that GitHub repo.
3. Add a PostgreSQL service.
4. On the app service set `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
5. Add `SESSION_SECRET` with a long random value and `NODE_ENV=production`.
6. Run `npm run db:init` once (Railway pre-deploy command is a convenient option).
7. Generate a public domain under the service Networking settings.

## Local setup
Copy `.env.example` to `.env`, provide a PostgreSQL DATABASE_URL and SESSION_SECRET, then:
`npm install`
`npm run db:init`
`npm start`

## Important
The current pricing recommendation fields are stored by the app but are entered manually. Automated market-price research can be added as the next service/module.

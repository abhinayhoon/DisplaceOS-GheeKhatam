# DisplaceOS

**A shared coordination workspace for disaster relief.** DisplaceOS brings camp needs, resource requests, response assignments, and delivery updates into one role-based view, helping coordination teams follow a request from the field to fulfillment.

## For judges

Open the deployed site and choose one of the three demo roles. No email or password is needed for the demo shortcuts:

- **NDMA Command** for coordination and allocation
- **Relief Camp Manager** for reporting needs and updating camp records
- **NDRF Field Unit** for reviewing and updating assigned dispatches

Try the full workflow: submit a request as a camp manager, review and approve it as NDMA Command, then update its dispatch and delivery as the field unit. Return to the coordination view to see the shared record. The government role also has controls to run and reset the sample crisis scenario. The demo database is shared by all visitors, so resetting it restores the common sample scenario.

## What the workspace supports

- Separate permissions for government coordination, relief camps, and rescue teams
- Shared records for camps, stock, resource requests, dispatches, facilities, and displaced people
- Request review, available-stock allocation, linked dispatches, and delivery updates
- Field-entered stock verification with an audit history
- A local action queue for reconnecting a device and syncing queued actions
- Camp weather context from the Open-Meteo forecast model
- Scenario controls for demonstrating how teams can coordinate a changing incident

Dashboard updates refresh from the shared application database while the page is open. Camp, person, and dispatch records in the judge environment are sample data. The weather card is a forecast model, not an official warning. Official alert, GPS, dispatch-system, and radio connections require authorized interfaces from the relevant agencies and operators.

Urgency scores are prioritization heuristics. They are not medical triage or independently verified field measurements. Decisions in an actual response must follow the responsible agency's procedures and verified reports.

## Local development

Requirements: Node.js 20.9 or newer and Docker Compose.

```sh
npm ci
cp .env.example .env
```

Set a private `BETTER_AUTH_SECRET` of at least 32 characters in `.env`, then start and prepare the database:

```sh
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Seeding recreates the sample camps, requests, dispatches, and people. It does not create email/password accounts. Use the role shortcuts on the sign-in screen.

## Deploy a judge demo

Use a managed PostgreSQL database dedicated to the demo. Configure these variables in the hosting provider before building:

```dotenv
DATABASE_URL=<managed PostgreSQL connection string>
BETTER_AUTH_SECRET=<private random value, at least 32 characters>
DEMO_MODE=true
PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

Apply the database migrations and load the sample scenario once:

```sh
npm run db:migrate
npm run db:seed
```

Then deploy the `main` branch. The `NEXT_PUBLIC_DEMO_MODE` value is embedded during the build, so rebuild after changing it. The public demo gate must be enabled on the server as well. Anyone with the demo URL can enter as any of the three roles, and demo actions edit the shared sample database. Keep real operational and personal information out of this database.

For an authenticated deployment, disable all three demo variables and provision named operator accounts through the trusted deployment environment. Camp users may request an account; a trusted administrator approves it. Government and rescue roles cannot be self-selected.

## Demo account provisioning

Set these variables in a trusted shell, then run `npm run operator:provision`:

```dotenv
OPERATOR_EMAIL=
OPERATOR_NAME=
OPERATOR_PASSWORD=
OPERATOR_ROLE=GOV_AGENCY
OPERATOR_CAMP_ID=
```

Supported roles are `GOV_AGENCY`, `RESCUE_TEAM`, and `RELIEF_CAMP`. A camp operator also needs a valid `OPERATOR_CAMP_ID`. Never commit operator passwords or production secrets.

## Technology and checks

Next.js, React, TypeScript, PostgreSQL, and Prisma. GitHub Actions runs the quality checks on each push and pull request.

```sh
npm run db:generate
npx prisma validate
npm run lint
npm run typecheck
npm test
npm run build
```

## Contributors

- **Rohini Srivastava**, Lead
- **Abhinay Pratap Singh**
- **Yashika Joshi**
- **Vedika Gupta**

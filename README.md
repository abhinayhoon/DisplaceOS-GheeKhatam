# DisplaceOS

**One shared operating picture for disaster relief teams.** DisplaceOS is a hackathon prototype that brings camp needs, supply requests, survivor records, and response dispatches into one role-based dashboard. It is designed to help teams see reported needs and coordinate the next step from a shared record.

> **Prototype notice:** Weather context comes from an external forecast model, but it is not an official warning. DisplaceOS is not connected to government systems, emergency services, GPS trackers, dispatch consoles, radios, or field devices. Its operational scenario is sample data. It cannot verify that a vehicle departed, a route is safe, supplies arrived, or a person was evacuated. Do not use it to direct a real emergency response or enter real survivor information.

## The problem we are exploring

During a disaster, information about shelter capacity, essential supplies, and urgent cases can be spread across calls, messages, and separate spreadsheets. That makes it harder for a coordination team to understand where help is needed and what has already been requested.

DisplaceOS explores a shared workflow: camps record needs, a government coordination role reviews and allocates resources, and a rescue team records dispatch progress. Each role sees the same server-backed records with permissions suited to its work.

## Three roles, one workflow

### Government coordination

- Review camp status, requests, depot stock, and active dispatches.
- Compare reported food stock with estimated runway and identify suggested transfers.
- Approve a request to create a linked dispatch and allocate available depot stock.
- Review field-entered stock counts and facility repair requests.

### Relief camp teams

- Submit requests for food, water, medicine, shelter, or evacuation support.
- Record stock adjustments and register people at their assigned camp.
- Update permitted survivor statuses and request facility repairs.

### Rescue teams

- Review active dispatch records and update route or progress status.
- Record delivery in the shared workflow so the associated request and camp inventory can be updated.
- Enter an observed food count when performing a field stock check.

The urgency and stock consistency values are heuristics for prioritizing review. They are not clinical triage, probabilities, or independently verified measurements. A person must make operational decisions using verified field information and local procedures.

## What works in this prototype

- Role-based access for government, camp, and rescue-team accounts.
- Shared camp, request, depot, dispatch, facility, and survivor records.
- Resource request review, depot allocation, dispatch tracking, and delivery updates.
- A device-local offline action queue that can be synchronized when the browser reconnects.
- Operator-entered stock verification with a hash-linked audit history.
- Weather model context for camp coordinates, refreshed from Open-Meteo and clearly separated from official warnings.
- Optional synthetic scenario controls for demonstrations.

The dashboard polls server records while visible. Polling is not a live connection to the field. The weather panel shows model output, not an observation from camp or an official warning. Open-Meteo's free API is intended for non-commercial use; commercial use requires its commercial service. Attribution is included in the dashboard. The offline queue uses browser storage, is not encrypted, can be lost if browser data is cleared, and does not use radio, mesh, or peer-to-peer networking.

## Run the demo locally

### Requirements

- Node.js 20.9 or newer
- Docker with Docker Compose

### Setup

```sh
npm ci
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` in `.env` to a private random string of at least 32 characters. Start the local database and prepare the sample data:

```sh
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Seeding resets the demo camps, requests, dispatches, and sample people. It does not create user accounts.

### Demo access

For a local presentation only, set both values below in `.env`, restart the app, and use the demo role shortcuts on the sign-in screen:

```dotenv
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

These shortcuts do not verify identity. Use only with the included sample scenario. Set both values to `false` for a deployed demo that uses provisioned accounts, and never enable demo shortcuts with real operational or personal data.

## Troubleshooting

- **“The database is not reachable” on the sign-in screen:** start PostgreSQL with `docker compose up -d postgres`, then run `npm run db:migrate` and `npm run db:seed`. Keep the database running while using the app.
- **“The database is missing application tables”:** run the migrations. For a fresh local demo database, seed the sample scenario after migrations.
- **“BETTER_AUTH_SECRET is missing or too short”:** set a private value of at least 32 characters in `.env` and restart the development server.
- **“Invalid email or password”:** use a provisioned operator account, or select a demo role when demo mode is enabled. Demo accounts are not email/password accounts.

The sign-in screen checks these dependencies before credentials are submitted, so setup problems are shown separately from invalid passwords.

## Create operator accounts

Camp users can submit a registration request, but cannot sign in until approved. Government and rescue roles cannot be self-selected. A trusted administrator provisions an account from a secure shell by setting these environment variables:

```dotenv
OPERATOR_EMAIL=
OPERATOR_NAME=
OPERATOR_PASSWORD=
OPERATOR_ROLE=GOV_AGENCY
OPERATOR_CAMP_ID=
```

Use `GOV_AGENCY`, `RESCUE_TEAM`, or `RELIEF_CAMP` for `OPERATOR_ROLE`. Set `OPERATOR_CAMP_ID` for a camp operator. Then run:

```sh
npm run operator:provision
```

The provision command creates or updates the account and revokes its existing sessions. Keep operator credentials out of source control and rotate them if exposed.

## Deploying a demonstration

Use a managed PostgreSQL database and a host that supports the project's Next.js version. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `NODE_ENV=production`; use HTTPS. Set both demo mode variables to `false`. Apply migrations with `npm run db:migrate`, then provision named operator accounts through a trusted environment. Do not run `npm run db:seed` against a deployed database because it resets demo records.

Configure the hosting proxy to overwrite the client IP header used by rate limiting. Do not trust forwarding headers supplied directly by a public client. Keep database backups and secrets under the hosting provider's access controls.

Before any real-world pilot, the responsible organization would still need to validate identity and role assignment, field procedures, data protection and retention, incident audit requirements, backups and recovery, monitoring, accessibility, load and failure behavior, and training. The remaining connections need the relevant agency and hardware owners:

- **Official weather warnings:** IMD publishes weather, nowcast, and warning APIs, but organizations must follow its terms and coordinate access with IMD. The dashboard's Open-Meteo model forecast is not a substitute. See the [IMD API reference](https://api.imd.gov.in/public/api_reference.html).
- **Disaster alerts:** NDMA's SACHET CAP feed has agency integration requirements, including ETag caching. See the [SACHET integration guide](https://sachet.ndma.gov.in/docs/Integration_Guide_For_Agencies.pdf).
- **Dispatch:** India's ERSS-112 is a state-centric system with computer-aided dispatch. Integration needs authorization and a supported interface from the relevant State/UT and its system operator. See the [Ministry of Home Affairs ERSS overview](https://www.mha.gov.in/nirbhayaerss-section).
- **Vehicle GPS:** a tracking server, registered devices, and operator access are required. [Traccar's API](https://www.traccar.org/traccar-api/) provides a possible integration path when an agency operates or authorizes that service.
- **Radio:** the agency's radio vendor, network, and authorized IP gateway determine the integration. A browser or AI API cannot access radio traffic by itself.

This repository does not include those agency integrations or operational approvals.

## Checks

```sh
npm run db:generate
npx prisma validate
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the checks on pushes and pull requests.

## Built by

- **Rohini Srivastava**, Lead
- **Abhinay Pratap Singh**
- **Yashika Joshi**
- **Vedika Gupta**

# PickMe (ETH Bootcamp MVP)

## 1. Project Overview
PickMe is a fair participant picker for live ETH bootcamp quiz/training sessions.

- Participants join from `/` using an EVM wallet identity.
- They sign a fixed login message to prove wallet ownership.
- Host controls rounds from `/host`.
- First 3 valid `PICK ME` clicks are selected in server receive order.
- All round logic is real-time and off-chain via Socket.IO.

## 2. Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Socket.IO (`socket.io` + `socket.io-client`)
- wagmi + viem (wallet connect + message signing/verification)
- In-memory state (no database)
- Custom Node server (`server.ts`) to run Next.js + Socket.IO on one port

## 3. Why No Smart Contract Is Needed
This MVP does not require trustless settlement or token transfers.

- Wallet is used only as identity (sign-in proof).
- No on-chain writes are needed for round timing or winner selection.
- No gas fees, no contracts, no transactions.
- Real-time fairness is based on server receive order of clicks.

## 4. Installation Command
```bash
npm install
```

## 5. Development Command
```bash
npm run dev
```

Default URL:
- Participant: `http://localhost:3000/`
- Host: `http://localhost:3000/host`

## 6. How To Test With Multiple Browser Tabs
1. Open `/host` in one tab.
2. Open `/` in at least 3 additional tabs/devices.
3. Join participants with unique wallet addresses and display names.
4. Confirm host participant count increases in real time.
5. Click `Open Pick` on host.
6. Click `PICK ME` quickly in participant tabs.
7. Confirm host immediately shows top 3.
8. Confirm round auto-closes after 3 selections.
9. Confirm non-selected users see `Too late. Wait for the next round.`
10. Click `Reset` on host and repeat.

## 7. How To Enable Mock Wallet Mode Locally
Mock mode is disabled by default and intended only for local development.

1. Create `.env.local`.
2. Set:
   ```env
   NEXT_PUBLIC_ENABLE_MOCK_WALLET=true
   ```
3. Restart dev server.
4. On `/`, enable `Mock mode` and enter fake `0x...` addresses + display names.

## 8. Deployment Notes
- This project uses a custom server (`server.ts`), so deploy to a Node host (Render, Railway, Fly.io, VPS, etc.).
- Build:
  ```bash
  npm run build
  ```
- Start:
  ```bash
  npm run start
  ```
- Set `PORT` in your host environment if required.
- Keep `NEXT_PUBLIC_ENABLE_MOCK_WALLET=false` in production.

## Project Structure
```text
app/
  page.tsx
  host/page.tsx
components/
  AppProviders.tsx
  HostClient.tsx
  HostControls.tsx
  ParticipantClient.tsx
  ParticipantJoinForm.tsx
  PickButton.tsx
  SelectedList.tsx
  StatusBadge.tsx
  WalletConnect.tsx
lib/
  constants.ts
  formatAddress.ts
  socket.ts
  types.ts
  wallet.ts
server/
  socket-server.ts
server.ts
```

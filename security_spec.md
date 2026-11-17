# Security Specification — Gapura Enterprise Firestore

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}`, `/invoices/{invoiceId}`, `/schedules/{scheduleId}`, and `/payrolls/{payrollId}` belongs to exactly one verified authenticated user (`ownerId == request.auth.uid` or `userId == request.auth.uid`). No cross-user read, list, create, update, or delete is permitted.
2. **Verified Identity**: All reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Timestamps**: `ownerId` (or `uid`) and `createdAt` cannot be modified after creation. `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on every write.
4. **Strict Schema Keys & Payload Bounds**: Every write validates required fields (`hasAll`), forbids shadow/ghost fields (`hasOnly`), enforces path ID syntax (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars), and bounds every string and array size.
5. **Action-Based Updates**: Updates are partitioned into explicit actions using `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating an invoice with `request.auth == null`.
2. **Unverified Email Spoof**: Accessing data with `request.auth.token.email_verified == false`.
3. **Identity Spoofing on Create**: Creating a schedule with `ownerId: "victim-uid"` while signed in as `"attacker-uid"`.
4. **Cross-User Read/Get**: Reading another user's `/invoices/{id}` or `/users/{otherUid}`.
5. **Unfiltered List Scraping**: Running `collection('invoices').get()` without `.where('ownerId', '==', uid)`.
6. **Shadow / Ghost Field Injection**: Creating or updating a schedule with an extra unexpected key `{ ..., isAdmin: true }`.
7. **ID Poisoning**: Creating `/invoices/invalid$id!@#` or a 500-character document ID.
8. **Ownership Hijack on Update**: Updating an existing invoice to change `ownerId` to another UID.
9. **Immutable Timestamp Tampering**: Updating an invoice to alter `createdAt` or forging `updatedAt` in the past.
10. **Array Exhaustion / Denial of Wallet**: Creating an invoice with 500 items or user presets with 500 items.
11. **Oversized String Poisoning**: Sending a 2MB `notes` or `customerName` string.
12. **Invalid Enum / Negative Money**: Creating a schedule with `status: "DELETED"` or invoice with `downPayment: -50000`.

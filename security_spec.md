# Security Spec: Leaflet

## Data Invariants
1. A leaf must be owned by the user whose tree it sits on.
2. Fertilizer cannot be negative.
3. Tree level can only increase or stay the same (nurtured).
4. Status transitions follow: `on_tree` -> `fallen` -> `raked` -> `growing` -> `on_tree`.
5. Connection IDs must be unique per pair (e.g., `uid1_uid2` alphabetically).

## The Dirty Dozen Payloads (Deny cases)
1. **Identity Spoofing**: User A tries to create a leaf on User B's tree.
2. **State Shortcutting**: Transitioning a leaf from `on_tree` directly to `raked` without `fallen`.
3. **Resource Poisoning**: Setting `imageUrl` to a 10MB string.
4. **Invalid Path**: Requesting document with ID `../../etc/passwd`.
5. **Unauthorized Rake**: User B tries to rake User A's leaves.
6. **Negative Fertilizer**: Updating User doc with `fertilizer: -100`.
7. **Phantom Branch**: Creating a connection where neither user is the current user.
8. **Shadow Fields**: Adding `isVerified: true` to a User profile.
9. **Admin Escallation**: Trying to set a non-existent `isAdmin` flag.
10. **Query Scraping**: Attempting to list all users without auth.
11. **Leaf Theft**: Trying to delete someone else's leaf.
12. **Future Timestamp**: Setting `updatedAt` to a year from now (Server timestamp required).

## Test Runner (Conceptual)
The rules enforce the above via:
- `isOwner(userId)` checks.
- `isValidLeaf` and `isValidUser` schema checks.
- `incoming().diff(existing()).affectedKeys().hasOnly(...)` for strict updates.
- Server timestamp validation (to be added to rules).

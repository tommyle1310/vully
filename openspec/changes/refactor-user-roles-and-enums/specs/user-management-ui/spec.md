## ADDED Requirements

### Requirement: User List Page
The system SHALL provide a `/users` page accessible only to admins that displays all users in a paginated, searchable table using TanStack Table.

#### Scenario: Admin views user list
- **WHEN** an admin navigates to `/users`
- **THEN** a table SHALL display users with columns: Name, Email, Roles, Status (active/inactive), Created Date
- **AND** the table SHALL support pagination and search/filter

#### Scenario: Non-admin denied access
- **WHEN** a non-admin user navigates to `/users`
- **THEN** they SHALL be redirected to the dashboard with an access denied indication

#### Scenario: User list loading state
- **WHEN** the user list is loading
- **THEN** a skeleton loader SHALL be displayed (CLS = 0)

### Requirement: Create User Dialog
The system SHALL provide a dialog for admins to create new users with role assignment.

#### Scenario: Admin creates user with roles
- **WHEN** an admin fills in the create user form with email, name, password, and selects roles `[resident, technician]`
- **AND** submits the form
- **THEN** the user SHALL be created with the specified roles
- **AND** a success toast SHALL be displayed
- **AND** the user list SHALL refresh

#### Scenario: Role selection enforces 1-3 limit
- **WHEN** an admin is selecting roles in the create user form
- **THEN** at least 1 role MUST be selected
- **AND** at most 3 roles MAY be selected
- **AND** the submit button SHALL be disabled if the constraint is violated

#### Scenario: Duplicate email validation
- **WHEN** an admin attempts to create a user with an email that already exists
- **THEN** the form SHALL display a 409 conflict error message

### Requirement: Edit User Dialog
The system SHALL provide a dialog for admins to edit user details and role assignments.

#### Scenario: Admin edits user roles
- **WHEN** an admin opens the edit dialog for a user
- **AND** changes their roles from `[resident]` to `[resident, technician]`
- **AND** submits
- **THEN** the roles SHALL be updated
- **AND** the user list SHALL refresh

#### Scenario: Admin deactivates user
- **WHEN** an admin toggles a user's active status to inactive
- **THEN** the user SHALL be deactivated
- **AND** all their sessions SHALL be invalidated

### Requirement: User Management Uses Shadcn/UI Components
All form inputs, buttons, dialogs, selects, and table components in the user management UI SHALL use Shadcn/UI primitives. Native HTML `<button>`, `<input>`, `<select>`, `<dialog>` elements SHALL NOT be used directly.

#### Scenario: Role multi-select uses Shadcn component
- **WHEN** the admin selects roles for a user
- **THEN** the role selector SHALL use a Shadcn/UI multi-select or checkbox group component
- **AND** NOT a native `<select multiple>`

### Requirement: User Management API Integration via TanStack Query
All API calls in the user management page SHALL use TanStack Query hooks. Direct `fetch()` or `useEffect` for data fetching SHALL NOT be used.

#### Scenario: User list uses query hook
- **WHEN** the user list page loads
- **THEN** it SHALL use a `useUsers()` TanStack Query hook
- **AND** the hook SHALL handle caching, refetching, and error states

#### Scenario: Create user uses mutation hook
- **WHEN** the admin submits the create user form
- **THEN** a `useCreateUser()` mutation hook SHALL handle the API call
- **AND** on success, it SHALL invalidate the users query cache

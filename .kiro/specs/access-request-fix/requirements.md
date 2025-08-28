# Requirements Document

## Introduction

The access request functionality is currently broken due to a schema mismatch between the frontend form and the database. The RequestAccessForm component is trying to insert a plain `message` field into the access_requests table, but the database schema expects encrypted data in a `message_encrypted` field. This needs to be fixed to allow users to successfully submit access requests.

## Requirements

### Requirement 1

**User Story:** As a potential user, I want to submit an access request with my email and an optional message, so that I can request access to the application.

#### Acceptance Criteria

1. WHEN a user fills out the access request form with email and message THEN the system SHALL successfully store the request in the database
2. WHEN a user submits the form THEN the system SHALL encrypt the message field before storing it
3. WHEN the form submission is successful THEN the system SHALL display a success message to the user
4. WHEN there is an error during submission THEN the system SHALL display an appropriate error message

### Requirement 2

**User Story:** As a system administrator, I want access request messages to be encrypted in the database, so that sensitive information is protected.

#### Acceptance Criteria

1. WHEN an access request is stored THEN the message SHALL be encrypted using the application's encryption functions
2. WHEN the message field is empty THEN the system SHALL handle it gracefully without encryption errors
3. WHEN storing the request THEN the system SHALL use the correct database column names (message_encrypted)

### Requirement 3

**User Story:** As a user, I want the access request form to work reliably, so that I don't encounter technical errors when requesting access.

#### Acceptance Criteria

1. WHEN the form is submitted THEN the system SHALL not return "Could not find the 'message' column" errors
2. WHEN the database operation completes THEN the system SHALL return appropriate success or error responses
3. WHEN there are validation errors THEN the system SHALL display clear error messages to the user
# Privacy & Data Protection

## Overview

Over The Hill is designed with privacy-first principles. Your data is encrypted at rest and protected through multiple layers of security measures.

## Data Encryption

### What Gets Encrypted

- **Collection Names**: All collection names are encrypted using AES-256 encryption
- **Dot Labels**: All dot labels and descriptions are encrypted
- **Snapshot Data**: All snapshot data including collection names and dot data
- **User Preferences**: Sensitive user preferences are encrypted

### Encryption Method

- **Algorithm**: AES-256-CBC
- **Key Derivation**: User-specific keys derived from user ID and session token
- **Storage**: Encrypted data stored in base64 format
- **Search**: Hash-based search to avoid decryption for queries

### Key Features

- **User-Specific Keys**: Each user has their own encryption key
- **Session-Based**: Keys are derived from active session tokens
- **Automatic Rotation**: Keys change with each new session
- **Fallback Protection**: Base64 encoding as fallback if encryption fails

## Data Storage

### What We Store

| Data Type | Encrypted | Purpose |
|-----------|-----------|---------|
| Collection names | ✅ | Organize your hill charts |
| Dot labels | ✅ | Task descriptions |
| Dot positions | ❌ | Chart visualization |
| User preferences | ✅ | App customization |
| Authentication data | ❌ | Login management (handled by Supabase) |

### What We Don't Store

- Plain text content
- Personal identifying information beyond email
- Analytics or tracking data
- Third-party cookies
- IP addresses (beyond Supabase Auth requirements)

## Security Measures

### Database Security

- **Row Level Security (RLS)**: Users can only access their own data
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Secure Connections**: HTTPS-only connections
- **Input Validation**: All inputs validated and sanitized

### Application Security

- **Session Management**: Secure session handling
- **Authentication**: Supabase Auth with secure token management
- **Input Sanitization**: All user inputs sanitized
- **Error Handling**: Secure error messages without data leakage

## Privacy Features

### Data Minimization

- Only collect data necessary for app functionality
- No tracking or analytics data collection
- Minimal metadata storage

### User Control

- **Export Data**: Download all your data in encrypted format
- **Delete Data**: Permanently delete all your data
- **Privacy Settings**: Control privacy features
- **Encryption Testing**: Verify encryption is working

### Search Privacy

- Hash-based search to avoid decryption
- Search queries don't require decrypting all data
- Privacy-preserving search algorithms

## Data Access

### Your Data

- **Full Control**: You own and control all your data
- **Export Rights**: Download your data anytime
- **Deletion Rights**: Delete your data permanently
- **Transparency**: Clear information about what we store

### Our Access

- **No Access**: We cannot read your encrypted data
- **No Analytics**: We don't track your usage
- **No Sharing**: We don't share your data with third parties
- **Minimal Metadata**: Only store necessary operational data

## Compliance

### GDPR Compliance

- **Right to Access**: Export your data anytime
- **Right to Deletion**: Delete your data permanently
- **Data Portability**: Export in standard formats
- **Transparency**: Clear privacy information

### Security Standards

- **AES-256 Encryption**: Industry-standard encryption
- **HTTPS Only**: Secure connections
- **Row Level Security**: Database-level access control
- **Input Validation**: Protection against injection attacks

## Privacy Settings

### Available Controls

- **Data Encryption**: Always enabled (cannot be disabled)
- **Search Privacy**: Hash-based search enabled
- **Metadata Minimization**: Minimal metadata storage
- **Automatic Cleanup**: Optional automatic data cleanup

### Privacy Testing

- **Encryption Test**: Verify encryption is working
- **Security Audit**: Regular security assessments
- **Vulnerability Scanning**: Continuous security monitoring

## Data Retention

### Active Data

- **Collections**: Stored until deleted by user
- **Dots**: Stored until deleted by user
- **Snapshots**: Stored until deleted by user
- **Preferences**: Stored until account deletion

### Deleted Data

- **Immediate Deletion**: Deleted data is immediately removed
- **No Recovery**: Deleted data cannot be recovered
- **Cascade Deletion**: Related data deleted automatically

## Third-Party Services

### Supabase

- **Authentication**: Secure user authentication
- **Database**: Encrypted data storage
- **Hosting**: Secure cloud hosting
- **Compliance**: GDPR and SOC2 compliant

### No Other Third Parties

- **No Analytics**: No Google Analytics or similar
- **No Tracking**: No tracking scripts or cookies
- **No Advertising**: No ad networks or tracking
- **No Social Media**: No social media integrations

## Security Best Practices

### For Users

- **Strong Passwords**: Use strong, unique passwords
- **Session Management**: Log out when done
- **Data Export**: Regularly export your data
- **Privacy Settings**: Review and adjust privacy settings

### For Developers

- **Regular Audits**: Security code reviews
- **Dependency Updates**: Keep dependencies updated
- **Vulnerability Scanning**: Regular security scans
- **Incident Response**: Security incident procedures

## Contact & Support

### Privacy Questions

- **Email**: privacy@overthehill.app
- **Response Time**: Within 48 hours
- **Data Requests**: Handled within 30 days

### Security Issues

- **Security Email**: security@overthehill.app
- **Urgent Issues**: Immediate response
- **Bug Bounty**: Security vulnerability reporting

## Updates

### Privacy Policy Updates

- **Notification**: Users notified of changes
- **Consent**: Explicit consent for major changes
- **Transparency**: Clear explanation of changes
- **Grandfathering**: Existing users protected

### Security Updates

- **Automatic Updates**: Security patches applied automatically
- **User Notification**: Users notified of security updates
- **Backward Compatibility**: Updates maintain functionality
- **Testing**: All updates thoroughly tested

## Technical Details

### Encryption Implementation

```typescript
// User-specific key derivation
const userKey = await generateUserKey(userId, sessionToken)

// Encryption
const encrypted = await encryptData(plaintext, userKey)

// Decryption
const decrypted = await decryptData(encrypted, userKey)
```

### Database Schema

```sql
-- Encrypted collections
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name_encrypted TEXT NOT NULL,
  name_hash TEXT NOT NULL,
  -- ... other fields
);

-- Encrypted dots
CREATE TABLE dots (
  id TEXT NOT NULL,
  label_encrypted TEXT NOT NULL,
  label_hash TEXT NOT NULL,
  -- ... other fields
);
```

### Security Policies

```sql
-- Row Level Security
CREATE POLICY "Users can view their own collections" 
ON collections FOR SELECT 
USING (auth.uid() = user_id);
```

## Commitment

We are committed to protecting your privacy and maintaining the highest security standards. Our privacy-first approach ensures that your data remains yours and is protected at all times.

For questions about privacy or security, please contact us at privacy@overthehill.app.

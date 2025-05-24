# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within this GitHub Action, please send an email to the maintainer. All security vulnerabilities will be promptly addressed.

## Best Practices for Using This Action

### Handling Google Service Account Credentials

1. **Never commit credentials to your repository**
   - Always use GitHub Secrets to store your Google service account credentials
   - Reference them in your workflow using `${{ secrets.YOUR_SECRET_NAME }}`

2. **Limit service account permissions**
   - Create a dedicated service account with minimal permissions
   - Only grant access to the specific Google Drive folders needed

3. **Regularly rotate credentials**
   - Periodically generate new service account keys
   - Revoke old keys after updating your GitHub Secrets

4. **Use domain-wide delegation carefully**
   - Only enable domain-wide delegation if you need the `owner` feature
   - Limit the OAuth scopes granted to the service account

### Secure Usage in Workflows

1. **Limit when the action runs**
   - Only run on specific branches or events to prevent unauthorized uploads
   - Consider using environment protection rules for production credentials

2. **Be careful with public repositories**
   - In public repositories, ensure the action doesn't run on pull requests from forks
   - This prevents potential exposure of secrets

3. **Validate inputs**
   - Be cautious with dynamic inputs that could be manipulated
   - Consider adding additional validation in your workflow

## Version Updates

Keep this action updated to the latest version to benefit from security patches and improvements.


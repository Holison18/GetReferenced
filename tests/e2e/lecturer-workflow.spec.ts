import { test, expect } from '@playwright/test';

test.describe('Lecturer Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - lecturer user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'lecturer@university.edu');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/lecturer/dashboard');
  });

  test('should handle request acceptance workflow', async ({ page }) => {
    // Verify dashboard shows pending requests
    await expect(page.locator('[data-testid="pending-requests-count"]')).toBeVisible();

    // Click on first pending request
    await page.click('[data-testid="pending-request-0"]');

    // Review request details
    await expect(page.locator('[data-testid="request-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="student-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="request-purpose"]')).toBeVisible();
    await expect(page.locator('[data-testid="deadline"]')).toBeVisible();

    // View student documents
    await page.click('[data-testid="view-transcript-button"]');
    await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
    await page.click('[data-testid="close-document-viewer"]');

    // Accept the request
    await page.click('[data-testid="accept-request-button"]');
    await expect(page.locator('[data-testid="acceptance-confirmation"]')).toBeVisible();

    // Verify request moved to accepted section
    await page.click('[data-testid="close-modal-button"]');
    await expect(page.locator('[data-testid="accepted-requests-count"]')).toContainText('1');
  });

  test('should handle request decline with reason', async ({ page }) => {
    await page.click('[data-testid="pending-request-0"]');

    // Decline the request
    await page.click('[data-testid="decline-request-button"]');

    // Provide decline reason
    await page.selectOption('[data-testid="decline-reason-select"]', 'workload');
    await page.fill('[data-testid="decline-message-textarea"]', 'Currently overloaded with requests. Please try another lecturer.');

    await page.click('[data-testid="confirm-decline-button"]');

    // Verify decline confirmation
    await expect(page.locator('[data-testid="decline-confirmation"]')).toBeVisible();
  });

  test('should complete AI-assisted letter generation workflow', async ({ page }) => {
    // Navigate to accepted request
    await page.click('[data-testid="accepted-request-0"]');
    await page.click('[data-testid="work-on-letter-button"]');

    // Upload sample letters for style analysis
    await page.click('[data-testid="upload-sample-letters-button"]');
    const fileInput = page.locator('[data-testid="sample-letters-upload"]');
    await fileInput.setInputFiles([
      {
        name: 'sample1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Sample letter 1 content')
      },
      {
        name: 'sample2.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Sample letter 2 content')
      }
    ]);

    await page.click('[data-testid="analyze-style-button"]');
    await expect(page.locator('[data-testid="style-analysis-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="style-analysis-complete"]')).toBeVisible();

    // Rate student attributes
    await page.locator('[data-testid="work-ethic-slider"]').fill('9');
    await page.locator('[data-testid="communication-slider"]').fill('8');
    await page.locator('[data-testid="critical-thinking-slider"]').fill('9');
    await page.locator('[data-testid="teamwork-slider"]').fill('8');

    // Generate AI letter
    await page.click('[data-testid="generate-ai-letter-button"]');
    await expect(page.locator('[data-testid="ai-generation-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="generated-letter-content"]')).toBeVisible();

    // Review and refine
    await page.fill('[data-testid="refinement-prompt"]', 'Please add more specific examples of research work.');
    await page.click('[data-testid="refine-letter-button"]');
    await expect(page.locator('[data-testid="refined-letter-content"]')).toBeVisible();

    // Manual editing
    await page.click('[data-testid="manual-edit-button"]');
    await page.fill('[data-testid="letter-editor"]', 'Manually edited letter content...');

    // Preview with letterhead
    await page.check('[data-testid="include-letterhead-checkbox"]');
    await page.click('[data-testid="preview-letter-button"]');
    await expect(page.locator('[data-testid="letter-preview"]')).toBeVisible();

    // Submit letter
    await page.click('[data-testid="submit-letter-button"]');
    await page.check('[data-testid="declaration-checkbox"]');
    await page.click('[data-testid="confirm-submission-button"]');

    // Verify completion
    await expect(page.locator('[data-testid="letter-submitted-confirmation"]')).toBeVisible();
  });

  test('should manage sample letters and categories', async ({ page }) => {
    // Navigate to sample letters section
    await page.click('[data-testid="sample-letters-tab"]');

    // Upload new sample letter
    await page.click('[data-testid="add-sample-letter-button"]');
    
    const fileInput = page.locator('[data-testid="new-sample-upload"]');
    await fileInput.setInputFiles({
      name: 'new-sample.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('New sample letter content')
    });

    // Categorize the letter
    await page.selectOption('[data-testid="letter-category-select"]', 'academic');
    await page.selectOption('[data-testid="letter-purpose-select"]', 'graduate_school');
    await page.fill('[data-testid="letter-description-input"]', 'Strong recommendation for graduate school');

    await page.click('[data-testid="save-sample-letter-button"]');

    // Verify letter added
    await expect(page.locator('[data-testid="sample-letter-list"]')).toContainText('new-sample.pdf');

    // Edit existing sample letter
    await page.click('[data-testid="edit-sample-0"]');
    await page.fill('[data-testid="edit-description-input"]', 'Updated description');
    await page.click('[data-testid="save-changes-button"]');

    // Delete sample letter
    await page.click('[data-testid="delete-sample-0"]');
    await page.click('[data-testid="confirm-delete-button"]');
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
  });

  test('should handle notification preferences', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="lecturer-settings-button"]');

    // Update notification preferences
    await page.uncheck('[data-testid="email-notifications-checkbox"]');
    await page.check('[data-testid="whatsapp-notifications-checkbox"]');
    await page.uncheck('[data-testid="sms-notifications-checkbox"]');

    // Update notification types
    await page.check('[data-testid="new-request-notifications"]');
    await page.check('[data-testid="reminder-notifications"]');
    await page.uncheck('[data-testid="marketing-notifications"]');

    await page.click('[data-testid="save-preferences-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="preferences-saved-message"]')).toBeVisible();
  });

  test('should view payment history and payout details', async ({ page }) => {
    // Navigate to payments section
    await page.click('[data-testid="payments-tab"]');

    // Verify payment history display
    await expect(page.locator('[data-testid="payment-history-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-earnings"]')).toBeVisible();

    // View payout details
    await page.click('[data-testid="payout-details-0"]');
    await expect(page.locator('[data-testid="payout-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="payout-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="payout-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="payout-status"]')).toBeVisible();

    // Update payment method
    await page.click('[data-testid="update-payment-method-button"]');
    await page.fill('[data-testid="bank-account-input"]', '1234567890');
    await page.fill('[data-testid="routing-number-input"]', '021000021');
    await page.click('[data-testid="save-payment-method-button"]');

    await expect(page.locator('[data-testid="payment-method-updated"]')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Request Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - student user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'student@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/student/dashboard');
  });

  test('should complete full request creation workflow', async ({ page }) => {
    // Navigate to new request
    await page.click('[data-testid="new-request-button"]');
    await expect(page).toHaveURL('/student/new-request');

    // Step 1: Purpose selection
    await page.click('[data-testid="purpose-school-button"]');
    await page.click('[data-testid="next-step-button"]');

    // Step 2: Details
    await page.fill('[data-testid="recipient-name-input"]', 'Admissions Office');
    await page.fill('[data-testid="recipient-address-textarea"]', '123 University Ave, City, State 12345');
    await page.fill('[data-testid="program-name-input"]', 'Computer Science Masters');
    await page.fill('[data-testid="organization-name-input"]', 'Test University');
    await page.fill('[data-testid="deadline-input"]', '2024-12-31');
    await page.click('[data-testid="next-step-button"]');

    // Step 3: Lecturer selection
    await page.fill('[data-testid="lecturer-search-input"]', 'Dr. Smith');
    await page.click('[data-testid="lecturer-suggestion-0"]');
    await page.click('[data-testid="next-step-button"]');

    // Step 4: Document upload
    const fileInput = page.locator('[data-testid="document-upload"]');
    await fileInput.setInputFiles({
      name: 'supporting-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock document content')
    });

    // Add draft letter
    await page.fill('[data-testid="draft-letter-textarea"]', 'Dear Admissions Committee, I am applying for...');
    await page.click('[data-testid="next-step-button"]');

    // Step 5: Additional details
    await page.fill('[data-testid="additional-notes-textarea"]', 'Please emphasize my research experience.');
    await page.selectOption('[data-testid="delivery-method-select"]', 'email');
    await page.click('[data-testid="next-step-button"]');

    // Step 6: Payment
    await page.click('[data-testid="proceed-to-payment-button"]');

    // Mock payment form
    await page.fill('[data-testid="card-number-input"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry-input"]', '12/25');
    await page.fill('[data-testid="card-cvc-input"]', '123');
    await page.fill('[data-testid="cardholder-name-input"]', 'John Doe');

    await page.click('[data-testid="submit-payment-button"]');

    // Step 7: Confirmation
    await expect(page.locator('[data-testid="request-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="request-id"]')).toBeVisible();

    // Verify redirect to dashboard
    await page.click('[data-testid="view-request-button"]');
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });

  test('should handle token redemption for free request', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');

    // Complete steps 1-5 (same as above, abbreviated)
    await page.click('[data-testid="purpose-scholarship-button"]');
    await page.click('[data-testid="next-step-button"]');
    
    // Fill minimal required details
    await page.fill('[data-testid="organization-name-input"]', 'Scholarship Foundation');
    await page.fill('[data-testid="deadline-input"]', '2024-11-30');
    await page.click('[data-testid="next-step-button"]');
    
    // Select lecturer
    await page.click('[data-testid="lecturer-suggestion-0"]');
    await page.click('[data-testid="next-step-button"]');
    
    // Skip document upload
    await page.click('[data-testid="next-step-button"]');
    
    // Skip additional details
    await page.click('[data-testid="next-step-button"]');

    // Payment step - use token
    await page.click('[data-testid="use-token-button"]');
    await page.fill('[data-testid="token-code-input"]', 'FREE2024');
    await page.click('[data-testid="apply-token-button"]');

    // Verify token applied
    await expect(page.locator('[data-testid="token-applied-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-amount"]')).toHaveText('$0.00');

    await page.click('[data-testid="submit-free-request-button"]');

    // Verify success
    await expect(page.locator('[data-testid="request-success-message"]')).toBeVisible();
  });

  test('should validate form fields and show appropriate errors', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');

    // Try to proceed without selecting purpose
    await page.click('[data-testid="next-step-button"]');
    await expect(page.locator('[data-testid="purpose-error"]')).toBeVisible();

    // Select purpose and proceed
    await page.click('[data-testid="purpose-job-button"]');
    await page.click('[data-testid="next-step-button"]');

    // Try to proceed without required details
    await page.click('[data-testid="next-step-button"]');
    await expect(page.locator('[data-testid="organization-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="deadline-error"]')).toBeVisible();
  });

  test('should handle lecturer selection with AI suggestions', async ({ page }) => {
    await page.click('[data-testid="new-request-button"]');

    // Navigate to lecturer selection step
    await page.click('[data-testid="purpose-school-button"]');
    await page.click('[data-testid="next-step-button"]');
    
    await page.fill('[data-testid="organization-name-input"]', 'Test University');
    await page.fill('[data-testid="deadline-input"]', '2024-12-31');
    await page.click('[data-testid="next-step-button"]');

    // Test AI suggestions
    await page.click('[data-testid="get-ai-suggestions-button"]');
    await expect(page.locator('[data-testid="ai-suggestions-loading"]')).toBeVisible();
    
    // Wait for suggestions to load
    await expect(page.locator('[data-testid="ai-suggestion-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-suggestion-reason"]')).toBeVisible();

    // Select AI suggested lecturer
    await page.click('[data-testid="select-ai-suggestion-0"]');
    await expect(page.locator('[data-testid="selected-lecturer-0"]')).toBeVisible();
  });
});
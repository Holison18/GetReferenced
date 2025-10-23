import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete student registration workflow', async ({ page }) => {
    await page.goto('/signup');

    // Select student role
    await page.click('[data-testid="student-role-button"]');

    // Fill basic information
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.fill('[data-testid="email-input"]', 'john.doe@student.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');

    // Fill student-specific information
    await page.fill('[data-testid="enrollment-year-input"]', '2020');
    await page.fill('[data-testid="completion-year-input"]', '2024');
    await page.fill('[data-testid="date-of-birth-input"]', '2000-01-01');

    // Upload transcript (mock file upload)
    const fileInput = page.locator('[data-testid="transcript-upload"]');
    await fileInput.setInputFiles({
      name: 'transcript.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });

    // Agree to terms
    await page.check('[data-testid="waiver-agreement-checkbox"]');
    await page.check('[data-testid="terms-agreement-checkbox"]');

    // Submit registration
    await page.click('[data-testid="submit-registration-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="registration-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-verification-notice"]')).toBeVisible();
  });

  test('should complete lecturer registration workflow', async ({ page }) => {
    await page.goto('/signup');

    // Select lecturer role
    await page.click('[data-testid="lecturer-role-button"]');

    // Fill basic information
    await page.fill('[data-testid="first-name-input"]', 'Dr. Jane');
    await page.fill('[data-testid="last-name-input"]', 'Smith');
    await page.fill('[data-testid="email-input"]', 'jane.smith@university.edu');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');

    // Fill lecturer-specific information
    await page.fill('[data-testid="staff-number-input"]', 'STAFF001');
    await page.selectOption('[data-testid="department-select"]', 'Computer Science');
    await page.selectOption('[data-testid="rank-select"]', 'Senior Lecturer');
    await page.fill('[data-testid="employment-year-input"]', '2015');

    // Set notification preferences
    await page.check('[data-testid="email-notifications-checkbox"]');
    await page.check('[data-testid="sms-notifications-checkbox"]');

    // Agree to terms
    await page.check('[data-testid="lecturer-agreement-checkbox"]');

    // Submit registration
    await page.click('[data-testid="submit-registration-button"]');

    // Verify success and verification notice
    await expect(page.locator('[data-testid="registration-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="staff-email-verification-notice"]')).toBeVisible();
  });

  test('should validate required fields and show errors', async ({ page }) => {
    await page.goto('/signup');

    // Select student role
    await page.click('[data-testid="student-role-button"]');

    // Try to submit without filling required fields
    await page.click('[data-testid="submit-registration-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });
});
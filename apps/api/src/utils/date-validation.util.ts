/**
 * Date Validation Utility
 *
 * Provides validation and correction suggestions for receipt dates
 * to handle OCR date extraction errors (like extracting 2028 instead of 2023)
 */

export interface DateValidationResult {
  isValid: boolean;
  originalDate: string;
  parsedDate?: Date;
  suggestedDate?: Date;
  warnings: string[];
  requiresUserConfirmation: boolean;
  validationRules: string[];
}

export class DateValidationUtil {
  private static readonly CURRENT_YEAR = new Date().getFullYear();
  private static readonly MIN_VALID_YEAR = 2000; // Receipts shouldn't be older than 2000
  private static readonly MAX_FUTURE_DAYS = 1; // Allow 1 day in the future for timezone differences

  /**
   * Validate a receipt date and provide correction suggestions
   */
  static validateReceiptDate(dateString: string): DateValidationResult {
    const result: DateValidationResult = {
      isValid: true,
      originalDate: dateString,
      warnings: [],
      requiresUserConfirmation: false,
      validationRules: [],
    };

    // Handle empty or invalid date strings
    if (!dateString || dateString.trim() === '') {
      result.isValid = false;
      result.warnings.push('Date not extracted from receipt');
      result.requiresUserConfirmation = true;
      result.validationRules.push('EMPTY_DATE');
      return result;
    }

    // Try to parse the date
    let parsedDate: Date;
    try {
      parsedDate = new Date(dateString);

      // Check if the date is valid (not NaN)
      if (isNaN(parsedDate.getTime())) {
        result.isValid = false;
        result.warnings.push(`Invalid date format: "${dateString}"`);
        result.requiresUserConfirmation = true;
        result.validationRules.push('INVALID_FORMAT');
        return result;
      }

      result.parsedDate = parsedDate;
    } catch {
      result.isValid = false;
      result.warnings.push(`Failed to parse date: "${dateString}"`);
      result.requiresUserConfirmation = true;
      result.validationRules.push('PARSE_ERROR');
      return result;
    }

    const currentDate = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(currentDate.getDate() + this.MAX_FUTURE_DAYS);

    // Validation rules
    const year = parsedDate.getFullYear();

    // Rule 1: Check for future dates (likely OCR error)
    if (parsedDate > maxFutureDate) {
      result.isValid = false;
      result.warnings.push(
        `Date is in the future: ${this.formatDateForUser(parsedDate)} (detected: ${year})`,
      );
      result.requiresUserConfirmation = true;
      result.validationRules.push('FUTURE_DATE');

      // Suggest correction for common OCR errors
      const suggestedDate = this.suggestDateCorrection(parsedDate, currentDate);
      if (suggestedDate) {
        result.suggestedDate = suggestedDate;
        result.warnings.push(
          `Suggested date: ${this.formatDateForUser(suggestedDate)}`,
        );
      }
    }

    // Rule 2: Check for dates that are too old
    if (year < this.MIN_VALID_YEAR) {
      result.isValid = false;
      result.warnings.push(
        `Date is too old: ${this.formatDateForUser(parsedDate)} (year: ${year})`,
      );
      result.requiresUserConfirmation = true;
      result.validationRules.push('TOO_OLD');
    }

    // Rule 3: Check for dates more than 2 years in the past (possible but suspicious)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(currentDate.getFullYear() - 2);

    if (parsedDate < twoYearsAgo) {
      // Not invalid, but suspicious - add warning without requiring confirmation
      result.warnings.push(
        `Date is more than 2 years old: ${this.formatDateForUser(parsedDate)}`,
      );
      result.validationRules.push('VERY_OLD');
    }

    // Rule 4: Check for year digits that might be OCR errors (e.g., 2028 instead of 2023)
    if (year > this.CURRENT_YEAR + 1) {
      result.isValid = false;
      result.warnings.push(
        `Year seems incorrect: ${year} (current: ${this.CURRENT_YEAR})`,
      );
      result.requiresUserConfirmation = true;
      result.validationRules.push('INCORRECT_YEAR');

      // Suggest year correction
      const suggestedDate = this.suggestYearCorrection(parsedDate);
      if (suggestedDate) {
        result.suggestedDate = suggestedDate;
        result.warnings.push(
          `Suggested date: ${this.formatDateForUser(suggestedDate)}`,
        );
      }
    }

    return result;
  }

  /**
   * Suggest a date correction based on common OCR errors
   */
  private static suggestDateCorrection(
    invalidDate: Date,
    currentDate: Date,
  ): Date | null {
    const year = invalidDate.getFullYear();
    const currentYear = currentDate.getFullYear();

    // Common OCR errors and corrections
    const corrections: Array<{
      pattern: RegExp;
      correction: (year: number) => number;
    }> = [
      // 2028 -> 2023 (8 misread as 3)
      { pattern: /^20[6-9][8-9]$/, correction: (y) => y - 5 },
      // 2025-2027 -> current year (common future year errors)
      { pattern: /^20[2-3][5-7]$/, correction: () => currentYear },
      // Very future years -> current year
      { pattern: /^20[3-9]\d$/, correction: () => currentYear },
    ];

    for (const { pattern, correction } of corrections) {
      if (pattern.test(year.toString())) {
        const correctedYear = correction(year);
        if (
          correctedYear >= this.MIN_VALID_YEAR &&
          correctedYear <= currentYear
        ) {
          const suggestedDate = new Date(invalidDate);
          suggestedDate.setFullYear(correctedYear);
          return suggestedDate;
        }
      }
    }

    // Fallback: use current year if the month/day seem reasonable
    const suggestedDate = new Date(invalidDate);
    suggestedDate.setFullYear(currentYear);

    // Only suggest if the resulting date is reasonable (not in the future)
    if (suggestedDate <= currentDate) {
      return suggestedDate;
    }

    return null;
  }

  /**
   * Suggest year correction for dates with clearly wrong years
   */
  private static suggestYearCorrection(invalidDate: Date): Date | null {
    const currentDate = new Date();
    const suggestedDate = new Date(invalidDate);

    // Try current year first
    suggestedDate.setFullYear(currentDate.getFullYear());
    if (suggestedDate <= currentDate) {
      return suggestedDate;
    }

    // Try previous year
    suggestedDate.setFullYear(currentDate.getFullYear() - 1);
    return suggestedDate;
  }

  /**
   * Format date for user display
   */
  private static formatDateForUser(date: Date): string {
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  }

  /**
   * Get user-friendly validation message
   */
  static getValidationMessage(result: DateValidationResult): string {
    if (result.isValid) {
      return result.warnings.length > 0
        ? `Date accepted with warnings: ${result.warnings.join('; ')}`
        : 'Date is valid';
    }

    const mainIssue = result.warnings[0] || 'Date validation failed';
    const suggestion = result.suggestedDate
      ? ` Suggested correction: ${this.formatDateForUser(result.suggestedDate)}`
      : '';

    return `${mainIssue}.${suggestion} Please confirm the correct date.`;
  }

  /**
   * Log validation results for debugging
   */
  static logValidationResult(result: DateValidationResult): void {
    const logLevel = result.isValid ? 'info' : 'warn';
    const message = `📅 Date Validation: ${result.originalDate} -> ${this.getValidationMessage(result)}`;

    console[logLevel](message, {
      originalDate: result.originalDate,
      parsedDate: result.parsedDate?.toISOString(),
      suggestedDate: result.suggestedDate?.toISOString(),
      warnings: result.warnings,
      validationRules: result.validationRules,
      requiresUserConfirmation: result.requiresUserConfirmation,
    });
  }
}

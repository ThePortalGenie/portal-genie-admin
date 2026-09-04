export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
  severity: ValidationSeverity;
};

export type ValidationResult = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  isValid: boolean;
};

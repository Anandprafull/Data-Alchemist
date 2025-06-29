export interface ValidationError {
  file?: string;
  row?: number;
  column?: string;
  error: string;
  severity: 'error' | 'warning' | 'info';
  error_type?: string;
}

export interface ValidationResult<T> {
  validData: T[];
  errors: ValidationError[];
}

export class DataValidator {
  static validateClients(data: any[], filename: string): ValidationResult<any> {
    const validData: any[] = [];
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      try {
        // Basic client validation
        if (!row.ClientID && !row.clientid && !row.id) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'ClientID',
            error: 'Missing client ID',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        if (!row.ClientName && !row.name && !row.clientname) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'ClientName',
            error: 'Missing client name',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        validData.push(row);
      } catch (error) {
        errors.push({
          file: filename,
          row: index + 1,
          column: 'general',
          error: `Validation error: ${error}`,
          severity: 'error',
          error_type: 'validation_error'
        });
      }
    });

    return { validData, errors };
  }

  static validateWorkers(data: any[], filename: string): ValidationResult<any> {
    const validData: any[] = [];
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      try {
        if (!row.WorkerID && !row.workerid && !row.id) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'WorkerID',
            error: 'Missing worker ID',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        if (!row.WorkerName && !row.name && !row.workername) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'WorkerName',
            error: 'Missing worker name',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        validData.push(row);
      } catch (error) {
        errors.push({
          file: filename,
          row: index + 1,
          column: 'general',
          error: `Validation error: ${error}`,
          severity: 'error',
          error_type: 'validation_error'
        });
      }
    });

    return { validData, errors };
  }

  static validateTasks(data: any[], filename: string): ValidationResult<any> {
    const validData: any[] = [];
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      try {
        if (!row.TaskID && !row.taskid && !row.id) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'TaskID',
            error: 'Missing task ID',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        if (!row.TaskName && !row.name && !row.taskname) {
          errors.push({
            file: filename,
            row: index + 1,
            column: 'TaskName',
            error: 'Missing task name',
            severity: 'error',
            error_type: 'missing_required_field'
          });
          return;
        }

        validData.push(row);
      } catch (error) {
        errors.push({
          file: filename,
          row: index + 1,
          column: 'general',
          error: `Validation error: ${error}`,
          severity: 'error',
          error_type: 'validation_error'
        });
      }
    });

    return { validData, errors };
  }

  static validateCrossReferences(clients: any[], workers: any[], tasks: any[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Add cross-reference validation logic here
    // For now, return empty array
    
    return errors;
  }
}

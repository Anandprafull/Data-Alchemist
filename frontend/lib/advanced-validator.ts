import type { ValidationError } from './data-validator';

export class AdvancedValidator {
  static validateAll(
    clients: any[],
    workers: any[],
    tasks: any[],
    filenames: { clients: string; workers: string; tasks: string }
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Add advanced validation logic
    errors.push(...this.validateDuplicates(clients, 'clients', filenames.clients));
    errors.push(...this.validateDuplicates(workers, 'workers', filenames.workers));
    errors.push(...this.validateDuplicates(tasks, 'tasks', filenames.tasks));

    return errors;
  }

  private static validateDuplicates(data: any[], type: string, filename: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Set();
    
    data.forEach((item, index) => {
      const id = item.id || item.ClientID || item.WorkerID || item.TaskID;
      if (id && seen.has(id)) {
        errors.push({
          file: filename,
          row: index + 1,
          column: 'id',
          error: `Duplicate ${type} ID: ${id}`,
          severity: 'error',
          error_type: 'duplicate_id'
        });
      }
      if (id) seen.add(id);
    });

    return errors;
  }
}

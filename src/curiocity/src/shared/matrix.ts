import { z } from 'zod';

/**
 * A single trial-matrix cell: `(agent × case × repeat)` (D16). Kept in `shared/`
 * because it is referenced by config (matrix resolution), results (suite matrix
 * snapshot) and the CLI (dry-run print) alike.
 */
export const matrixCellSchema = z.object({
  case: z.string(),
  agent: z.string(),
  repeat: z.number().int().positive(),
});
export type MatrixCell = z.infer<typeof matrixCellSchema>;

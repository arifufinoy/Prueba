export const queryKeys = {
  meters: { all: ['meters'] as const, detail: (code: string) => ['meters', 'detail', code] as const },
  readings: { all: ['readings'] as const, employee: (code: string) => ['readings', 'employee', code] as const },
};

export const queryKeys = {
  meters: { detail: (code: string) => ['meters', 'detail', code] as const },
  readings: { all: ['readings'] as const },
};

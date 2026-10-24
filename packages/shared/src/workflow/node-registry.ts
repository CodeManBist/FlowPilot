
export interface NodeRegistry {
  supports(type: string, typeVersion: number): boolean;
}

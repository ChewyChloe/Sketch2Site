/** Small and low quality on purpose: enough to see what is big, where photos sit and the mood. */
export const snapshotLimits = { width: 448, maxHeight: 1400, maxChars: 120000 } as const;
export const SnapshotSchemaPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

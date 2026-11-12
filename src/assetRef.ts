import { z } from "zod";
export const localAssetPattern = /^\/assets\/local\/[a-f0-9]{64}\.png$/;
export const imageSource = z.union([z.literal("/assets/workspace.svg"), z.string().max(90).regex(localAssetPattern)]);
export function isLocalAsset(value: string) { return localAssetPattern.test(value); }

import { z } from "zod";
// Local photos are re-encoded in the browser: PNG keeps transparency, JPEG keeps photos small.
export const localAssetPattern = /^\/assets\/local\/[a-f0-9]{64}\.(png|jpg)$/;
export const builtInAssets=["/assets/workspace.svg","/assets/sequence/frame-01.svg","/assets/sequence/frame-02.svg","/assets/sequence/frame-03.svg","/assets/samples/cafe.jpg","/assets/samples/camera.jpg","/assets/samples/club-shadow.jpg","/assets/samples/club-camera.jpg","/assets/samples/club-exhibit.jpg","/assets/samples/course-dashboard.jpg","/assets/samples/course-result.jpg","/assets/samples/course-data.jpg","/assets/samples/course-slide.jpg","/assets/samples/coffee-flatwhite.jpg","/assets/samples/coffee-pourover.jpg","/assets/samples/coffee-tonic.jpg","/assets/samples/coffee-coldbrew.jpg"] as const;
export const imageSource = z.union([
  z.enum(builtInAssets),
  z.string().max(90).regex(localAssetPattern),
]);
export function isLocalAsset(value: string) {
  return localAssetPattern.test(value);
}

export function motionAssetRefs(effects: readonly {validatedControls: Record<string,unknown>}[]):string[]{return effects.flatMap(e=>[e.validatedControls.image,e.validatedControls.frames].flatMap(v=>typeof v==="string"&&imageSource.safeParse(v).success?[v]:Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&imageSource.safeParse(x).success):[]));}

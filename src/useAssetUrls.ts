import { useEffect, useState } from "react";
import { readAsset, listAssetRefs } from "./assets";
import { isLocalAsset } from "./assetRef";
export function useAssetUrls(refs: readonly string[]) {
  const signature = [...new Set(refs.filter(isLocalAsset))].sort().join("|");
  const [version, setVersion] = useState(0),
    [state, setState] = useState<{
      signature: string;
      urls: Record<string, string | null>;
    }>({ signature: "", urls: {} });
  useEffect(() => {
    const changed = () => setVersion((v) => v + 1);
    window.addEventListener("sketch-assets-changed", changed);
    return () => window.removeEventListener("sketch-assets-changed", changed);
  }, []);
  useEffect(() => {
    let canceled = false;
    const owned: string[] = [];
    const entries = signature ? signature.split("|") : [];
    setState({
      signature,
      urls: Object.fromEntries(entries.map((ref) => [ref, ""])),
    });
    if (signature)
      void Promise.all(
        entries.map(async (ref) => {
          try {
            const asset = await readAsset(ref);
            if (!asset || canceled) return [ref, null] as const;
            const url = URL.createObjectURL(asset.blob);
            owned.push(url);
            return [ref, url] as const;
          } catch {
            return [ref, null] as const;
          }
        }),
      ).then((values) => {
        if (!canceled)
          setState({ signature, urls: Object.fromEntries(values) });
      });
    return () => {
      canceled = true;
      owned.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [signature, version]);
  return state.signature === signature
    ? state.urls
    : Object.fromEntries(
        (signature ? signature.split("|") : []).map((ref) => [ref, ""]),
      );
}
export function useAssetRefs() {
  const [refs, setRefs] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const read = () => {
      void listAssetRefs()
        .then((v) => {
          if (live) setRefs(v);
        })
        .catch(() => {});
    };
    read();
    window.addEventListener("sketch-assets-changed", read);
    return () => {
      live = false;
      window.removeEventListener("sketch-assets-changed", read);
    };
  }, []);
  return refs;
}

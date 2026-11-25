import {builtInAssets} from "./assetRef";
import {useAssetRefs} from "./useAssetUrls";
import { motionCatalog, type MotionId, type MotionControls } from './motionCatalog';
function MotionAssets({label,multiple,value,onChange}:{label:string;multiple:boolean;value:MotionControls[string];onChange:(v:MotionControls[string])=>void}){
 const local=useAssetRefs(),choices=[...builtInAssets,...local],values=Array.isArray(value)?value:[];
 const name=(ref:string)=>ref==='/assets/workspace.svg'?'內建工作台圖片':ref.includes('/sequence/')?'內建序列影格 '+ref.slice(-6,-4):local.includes(ref)?'本機圖片 '+(local.indexOf(ref)+1):'尚未就緒的本機圖片';
 const select=<select aria-label={multiple?label+'新增影格':label} value={multiple?'':String(value??'')} onChange={e=>{if(e.target.value)onChange(multiple?[...values,e.target.value]:e.target.value);}}><option value="">{multiple?'選擇並新增影格':'請選擇圖片'}</option>{choices.filter(ref=>!multiple||!values.includes(ref)).map(ref=><option key={ref} value={ref}>{name(ref)}</option>)}</select>;
 return <div className="field motion-assets" role="group" aria-label={label+"設定"}><strong>{label}</strong>{multiple&&<ol>{values.map((ref,i)=><li key={ref}><span>{i+1}. {name(ref)}</span><button type="button" aria-label={'上移影格'+(i+1)} disabled={i===0} onClick={()=>{const next=[...values];[next[i-1],next[i]]=[next[i],next[i-1]];onChange(next);}}>↑</button><button type="button" aria-label={'下移影格'+(i+1)} disabled={i===values.length-1} onClick={()=>{const next=[...values];[next[i+1],next[i]]=[next[i],next[i+1]];onChange(next);}}>↓</button><button type="button" aria-label={'移除影格'+(i+1)} onClick={()=>onChange(values.filter((_,j)=>j!==i))}>×</button></li>)}</ol>}{(!multiple||values.length<12)&&select}{multiple&&<small>照順序播放，2 到 12 張</small>}</div>;
}
/** Metadata controls presentation only; values are validated again by the Patch engine. */
export function MotionControlsFields({ id, values, onChange }: {
    id: MotionId;
    values: MotionControls;
    onChange: (values: MotionControls) => void;
}) {
    return <div className="motion-controls">{Object.entries(motionCatalog[id].controls).map(([key, c]) => {
            const optionLabels: Record<string, string> = { origin:'原位',edge:'邊界',reveal:'重組',dissolve:'消散並歸位',star:'星形','rounded-square':'圓角方形',organic:'有機形狀',lime:'嫩綠',amber:'琥珀',sky:'天藍',theme:'主題色',clockwise:'順時針',counterclockwise:'逆時針',row:'行優先',column:'列優先',curve:'曲線',arrow:'箭頭',check:'勾線', horizontal:'水平',vertical:'垂直',smooth: '平順', linear: '等速', 'ease-out': '漸慢', 'in-view': '進入可視範圍', enter: '載入時', none: '無', subtle: '柔和', medium: '中等', forward: '正序', reverse: '倒序', fade: '淡入', 'slide-up': '向上滑入', scale: '縮放', gentle: '輕微', strong: '明顯', upward: '向上', downward: '向下', start: '起點', center: '置中', end: '終點', click: '點擊', hover: '懸停', 'top-right': '右上', 'top-left': '左上', 'bottom-right': '右下', 'bottom-left': '左下', x: '水平軸', y: '垂直軸' };
            const value = values[key] ?? c.default ?? '';
            const change = (next: MotionControls[string]) => onChange({ ...values, [key]: next });
            if(c.kind==='asset'||c.kind==='assets')return <MotionAssets key={key} label={c.label} multiple={c.kind==='assets'} value={value} onChange={change}/>;
            const label = key === 'durationMs' ? (id === 'fade-in' ? '動畫時長（毫秒）' : motionCatalog[id].nameZh + '時長') : c.label;
            return <label className="field" key={key}>{c.label}{c.kind === 'select' ? <select aria-label={label} value={String(value)} onChange={e => change(e.target.value)}>{c.options!.map(o => <option key={o} value={o}>{optionLabels[o] ?? o}</option>)}</select> : c.kind === 'boolean' ? <input aria-label={label} type="checkbox" checked={Boolean(value)} onChange={e => change(e.target.checked)}/> : c.kind === 'lines' ? <textarea aria-label={label} value={Array.isArray(value) ? value.join('\n') : String(value)} onChange={e => change(e.target.value.split('\n'))}/> : <input aria-label={label} type={c.kind === 'number' ? 'number' : 'text'} min={c.min} max={c.max} step={c.step} maxLength={c.kind === 'text' ? c.max : undefined} value={String(value)} onChange={e => change(c.kind === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}/>}</label>;
        })}</div>;
}

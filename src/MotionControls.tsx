import { Select } from "./Select";
import {builtInAssets} from "./assetRef";
import {useAssetRefs} from "./useAssetUrls";
import { motionCatalog, type MotionId, type MotionControls } from './motionCatalog';
function MotionAssets({label,multiple,value,onChange}:{label:string;multiple:boolean;value:MotionControls[string];onChange:(v:MotionControls[string])=>void}){
 const local=useAssetRefs(),choices=[...builtInAssets,...local],values=Array.isArray(value)?value:[];
 const name=(ref:string)=>ref==='/assets/workspace.svg'?'內建工作台圖片':ref.includes('/sequence/')?'內建序列影格 '+ref.slice(-6,-4):local.includes(ref)?'本機圖片 '+(local.indexOf(ref)+1):'尚未就緒的本機圖片';
 const select=<Select label={multiple?label+'新增影格':label} value={multiple?'':String(value??'')} onChange={v=>{if(v)onChange(multiple?[...values,v]:v);}} options={[{value:'',label:multiple?'選擇並新增影格':'請選擇圖片'},...choices.filter(ref=>!multiple||!values.includes(ref)).map(ref=>({value:ref,label:name(ref)}))]}/>;
 return <div className="field motion-assets" role="group" aria-label={label+"設定"}><strong>{label}</strong>{multiple&&<ol>{values.map((ref,i)=><li key={ref}><span>{i+1}. {name(ref)}</span><button type="button" aria-label={'上移影格'+(i+1)} disabled={i===0} onClick={()=>{const next=[...values];[next[i-1],next[i]]=[next[i],next[i-1]];onChange(next);}}>↑</button><button type="button" aria-label={'下移影格'+(i+1)} disabled={i===values.length-1} onClick={()=>{const next=[...values];[next[i+1],next[i]]=[next[i],next[i+1]];onChange(next);}}>↓</button><button type="button" aria-label={'移除影格'+(i+1)} onClick={()=>onChange(values.filter((_,j)=>j!==i))}><svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button></li>)}</ol>}{(!multiple||values.length<12)&&select}{multiple&&<small>照順序播放，2 到 12 張</small>}</div>;
}
/** Metadata controls presentation only; values are validated again by the Patch engine. */
export function MotionControlsFields({ id, values, onChange }: {
    id: MotionId;
    values: MotionControls;
    onChange: (values: MotionControls) => void;
}) {
    return <div className="motion-controls">{Object.entries(motionCatalog[id].controls).filter(([key]) =>
        !(id === "kinetic-text-wave" && key === "trigger" && values.form && values.form !== "bounce") &&
        !(id === "split-line-assembly" && key === "distancePx" && values.flow === "clarify") &&
        !(id === "grid-diagonal-turn" && key === "order" && values.motion === "radial") &&
        !(id === "letter-windows" && key === "image" && values.fill === "stripes") &&
        !(id === "curved-path-text" && (values.pathMode === "circle" || values.pathMode === "flow" ? !["pathMode", "cycleSeconds"].includes(key) : key === "cycleSeconds")) &&
        !(id === "stagger-reveal" && key === "revealStyle" && values.sequence && values.sequence !== "document")).map(([key, c]) => {
            const optionLabels: Record<string, string> = { impact: "落點倒數", arc: "弧形", circle: "環形旋轉", flow: "波浪流字", elastic: "彈性片語", "depth-trail": "縱深拖影", document: "原有順序", "reading-z": "Z 字閱讀", alternate: "左右交錯", signature: "筆尖簽名", photo: "照片", stripes: "流動條紋", fill: "螢光底色", "circle-line": "手繪圈線", redraw: "游標或鍵盤重描", "scroll-counter": "捲動三行", sharp: "俐落", soft: "柔邊漸層", clarify: "原地聚焦", flip: "翻入", radial: "中心縮放", glyph: "逐字對位", portal: "穿字轉場", squash: "壓扁換字", orbit: "環形換字", single: "單列", "dual-speed": "雙速橫幅", "counter-columns": "逆行直欄", "layered-rush": "疊層急流", "vertical-stack": "三疊直欄", "ribbon-cross": "交叉字帶", glow: "呼吸光", heartbeat: "心跳波紋", rise: "由下歸位", magnet: "雙向吸附", bounce: "逐字彈動", flag: "旗面飄揚", "stretch-wave": "縱向伸縮", trail: "拖影疾入", disclosure: "詳情收合", tabs: "底線分頁", cards: "整張卡片", media: "固定影像與捲動文案", press: "點擊融合", drift: "漂流融合", origin:'原位',edge:'邊界',reveal:'重組',dissolve:'消散並歸位',star:'星形','rounded-square':'圓角方形',organic:'有機形狀',lime:'嫩綠',amber:'琥珀',sky:'天藍',theme:'主題色',clockwise:'順時針',counterclockwise:'逆時針',row:'行優先',column:'列優先',curve:'曲線',arrow:'箭頭',check:'勾線', horizontal:'水平',vertical:'垂直',smooth: '平順', linear: '等速', 'ease-out': '漸慢', 'in-view': '進入可視範圍', enter: '載入時', none: '無', subtle: '柔和', medium: '中等', forward: '正序', reverse: '倒序', fade: '淡入', 'slide-up': '向上滑入', scale: '縮放', gentle: '輕微', strong: '明顯', upward: '向上', downward: '向下', start: '起點', center: '置中', end: '終點', click: '點擊', hover: '懸停', 'top-right': '右上', 'top-left': '左上', 'bottom-right': '右下', 'bottom-left': '左下', x: '水平軸', y: '垂直軸' };
            const value = values[key] ?? c.default ?? '';
            const change = (next: MotionControls[string]) => onChange({ ...values, [key]: next });
            if(c.kind==='asset'||c.kind==='assets')return <MotionAssets key={key} label={c.label} multiple={c.kind==='assets'} value={value} onChange={change}/>;
            const label = key === 'durationMs' ? (id === 'fade-in' ? '動畫時長（毫秒）' : motionCatalog[id].nameZh + '時長') : c.label;
            return <label className="field" key={key}>{c.label}{c.kind === 'select' ? <Select label={label} value={String(value)} onChange={v => change(v)} options={c.options!.map(o => ({ value: o, label: key === "entry" && o === "focus" ? "模糊對焦" : id === "elastic-word-bounce" && o === "impact" ? "逐字重落" : optionLabels[o] ?? o }))}/> : c.kind === 'boolean' ? <input aria-label={label} type="checkbox" checked={Boolean(value)} onChange={e => change(e.target.checked)}/> : c.kind === 'lines' ? <textarea aria-label={label} value={Array.isArray(value) ? value.join('\n') : String(value)} onChange={e => change(e.target.value.split('\n'))}/> : <input aria-label={label} type={c.kind === 'number' ? 'number' : 'text'} min={c.min} max={c.max} step={c.step} maxLength={c.kind === 'text' ? c.max : undefined} value={String(value)} onChange={e => change(c.kind === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}/>}</label>;
        })}</div>;
}

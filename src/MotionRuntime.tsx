import { useEffect, useId, useRef, useState, useMemo, type ReactNode, type CSSProperties } from 'react';
import { motionNumber, motionDuration, type MotionInstance } from './motion';
export function useReducedMotion() {
    const [reduced, setReduced] = useState(() => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => { if(typeof matchMedia !== 'function')return; const q = matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(q.matches); q.addEventListener('change', update); update(); return () => q.removeEventListener('change', update); }, []);
    return reduced;
}
export function CountUp({ effect, original }: {
    effect: MotionInstance;
    original: string;
}) {
    const c = effect.validatedControls, reduced = useReducedMotion(), ref = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState(Number(c.endValue));
    useEffect(() => {
        let frame = 0, observer: IntersectionObserver | undefined, started = false;
        const end = Number(c.endValue), start = Number(c.startValue), duration = motionDuration(effect);
        setValue(end);
        const begin = () => {
            if (started || reduced)
                return;
            started = true;
            let first: number | undefined;
            const step = (now: number) => { first ??= now; const p = Math.min(1, (now - first) / duration); setValue(p === 1 ? end : start + (end - start) * (1 - Math.pow(1 - p, 3))); if (p < 1)
                frame = requestAnimationFrame(step); };
            frame = requestAnimationFrame(step);
        };
        if (!reduced && ref.current) {
            observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) {
                begin();
                observer?.disconnect();
            } });
            observer.observe(ref.current);
        }
        return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
    }, [effect, c, reduced]);
    const formatted = new Intl.NumberFormat(String(c.locale), { minimumFractionDigits: Number(c.decimals), maximumFractionDigits: Number(c.decimals) }).format(value);
    return <span ref={ref} className="motion-number"><span className="motion-sr">{original}</span><span aria-hidden="true">{String(c.prefix)}{formatted}{String(c.suffix)}</span></span>;
}
export function curveRows(text:string, available:number, measure:(value:string)=>number):string[]{
    const segments=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),v=>v.segment):Array.from(text);
    const rows:string[]=[];let row='';
    for(const letter of segments){
        if(letter==='\n'){rows.push(row);row='';continue;}
        if(row&&measure(row+letter)>available){rows.push(row);row=letter;}else row+=letter;
    }
    rows.push(row);return rows;
}
export function CurvedText({ effect, text }: {effect:MotionInstance;text:string}) {
    const id='curve-'+useId().replaceAll(':',''),host=useRef<HTMLSpanElement>(null),reduced=useReducedMotion();
    const [width,setWidth]=useState(600),[fontSize,setFontSize]=useState(16),[font,setFont]=useState('16px sans-serif');
    useEffect(()=>{
        const el=host.current;if(!el)return;let live=true;
        const update=()=>{if(!live)return;const style=getComputedStyle(el),size=Math.max(16,parseFloat(style.fontSize)||16);setWidth(el.clientWidth);setFontSize(size);setFont(`${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`);};
        const observer=new ResizeObserver(update);observer.observe(el);update();void document.fonts?.ready.then(update);
        return()=>{live=false;observer.disconnect();};
    },[]);
    const layout=useMemo(()=>{
        const context=typeof CanvasRenderingContext2D==='undefined'?null:document.createElement('canvas').getContext('2d');if(context)context.font=font;
        const measure=(value:string)=>context?.measureText(value).width??Array.from(value).reduce((sum,c)=>sum+fontSize*(/[\u2e80-\u9fff]/u.test(c)?1:.65),0);
        const margin=Math.ceil(fontSize*.75+4),available=Math.max(1,width-margin*2);
        return {margin,rows:curveRows(text,available,measure).map(value=>({text:value,chord:Math.min(available,Math.max(fontSize*3,measure(value)))}))};
    },[text,width,font,fontSize]);
    const fallback=Array.from(text).length>240||width<80||layout.rows.length>8,c=effect.validatedControls;
    useEffect(()=>{
        const el=host.current;if(!el||reduced||fallback)return;const running:Animation[]=[];
        const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){for(const svg of el.querySelectorAll('svg'))if(svg.animate)running.push(svg.animate([{opacity:0},{opacity:1}],{duration:motionDuration(effect),easing:'ease-out'}));observer.disconnect();}});
        observer.observe(el);return()=>{observer.disconnect();running.forEach(a=>a.cancel());};
    },[effect,reduced,fallback,width,text,font]);
    return <span className="motion-curve" ref={host} data-curve-layout={fallback?'static':'curved'}>{fallback?text:<><span className="motion-sr">{text}</span>{layout.rows.map((row,index)=>{
        const rise=Math.min(row.chord*.3,fontSize*({gentle:1.5,medium:2.5,strong:3.5} as Record<string,number>)[String(c.curvature)]),down=c.direction==='downward';
        const baseline=fontSize+8+(down?0:rise),svgWidth=row.chord+layout.margin*2,height=rise+fontSize*2+16,pathId=id+'-'+index;
        return <svg key={index} aria-hidden="true" viewBox={`0 0 ${svgWidth} ${height}`} style={{width:svgWidth,maxWidth:'100%',marginLeft:c.textAlign==='start'?0:'auto',marginRight:c.textAlign==='end'?0:'auto'}}><defs><path id={pathId} d={`M ${layout.margin} ${baseline} Q ${svgWidth/2} ${baseline+(down?2:-2)*rise} ${svgWidth-layout.margin} ${baseline}`}/></defs><text style={{fontSize}} textAnchor={c.textAlign==='center'?'middle':c.textAlign==='end'?'end':'start'}><textPath href={'#'+pathId} startOffset={c.textAlign==='center'?'50%':c.textAlign==='end'?'100%':'0%'}>{row.text}</textPath></text></svg>;
    })}</>}</span>;
}
export function FlipCard({ effect, children }: {
    effect: MotionInstance;
    children: ReactNode;
}) {
    const [back, setBack] = useState(false), reduced = useReducedMotion(), c = effect.validatedControls;
    const style = { '--flip-duration': motionDuration(effect) + 'ms', '--flip-perspective': String(c.perspectivePx) + 'px', '--flip-rotation': c.axis === 'x' ? 'rotateX(180deg)' : 'rotateY(180deg)' } as CSSProperties;
    return <div className="motion-flip" style={style} data-back={back} data-reduced={reduced} onMouseEnter={() => { if (c.trigger === 'hover')
        setBack(true); }} onMouseLeave={() => { if (c.trigger === 'hover')
        setBack(false); }}>
  <div className="motion-flip-inner"><div className="motion-flip-front" inert={back} aria-hidden={back}>{children}</div><div className="motion-flip-back" inert={!back} aria-hidden={!back}>{String(c.backText)}</div></div>
  <button type="button" className="motion-toggle" aria-pressed={back} onClick={() => setBack(v => !v)}>{back ? '查看正面' : '查看背面'}</button>
 </div>;
}

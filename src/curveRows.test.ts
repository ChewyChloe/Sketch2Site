import {it,expect} from 'vitest';
import {curveRows} from './MotionRuntime';
const count=(text:string)=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)).length;
it('wraps Chinese without deleting, adding or reordering original content',()=>{
 const text='在這裡寫下想法'.repeat(6),rows=curveRows(text,10,count);expect(rows.join('')).toBe(text);expect(rows.every(row=>count(row)<=10)).toBe(true);
});
it('keeps combining marks and joined emoji together at line boundaries',()=>{
 expect(curveRows('e\u0301👩🏽‍💻家庭',2,count)).toEqual(['e\u0301👩🏽‍💻','家庭']);
});
it('respects explicit line breaks and blank lines',()=>{
 expect(curveRows('第一行\n\n第二行',20,count)).toEqual(['第一行','','第二行']);
});

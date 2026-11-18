import {it,expect} from 'vitest';
import {generationFixtures} from './demoFixtures';
import {createMotion} from './motion';
import {CanvasSchema} from './spec';
import {encodeNodes,decodeNodes,cloneNodes,deleteNodes,groupSelection,translateSelection} from './canvasEditing';
it('copies IDs, animation targets, internal anchors and groups without mutating source',()=>{
 const c=generationFixtures()[0];c.nodes[0].effects=[createMotion('fade-in',c.nodes[0].id)];const g=groupSelection(c,[c.nodes[0].id,c.nodes[5].id]);const before=JSON.stringify(g);
 const selected=[g.nodes[0].id,g.nodes[5].id],nodes=decodeNodes(encodeNodes(g,selected)),copies=cloneNodes(nodes);
 expect(copies[0].id).not.toBe(nodes[0].id);expect(copies[0].effects[0].targetId).toBe(copies[0].id);expect(copies[1].href).toBe('#'+copies[0].id);expect(copies[0].groupId).toBe(copies[1].groupId);expect(copies[0].groupId).not.toBe(nodes[0].groupId);expect(JSON.stringify(g)).toBe(before);
});
it('group translation clamps once for every member and one history change can undo it',()=>{const c=generationFixtures()[0],ids=c.nodes.map(n=>n.id);const moved=translateSelection(c,ids,2000,2000);expect(CanvasSchema.safeParse(moved).success).toBe(true);expect(moved.nodes[1].x-moved.nodes[0].x).toBe(c.nodes[1].x-c.nodes[0].x);expect(moved.nodes[1].y-moved.nodes[0].y).toBe(c.nodes[1].y-c.nodes[0].y);});
it('deleting an anchor target clears dangling links, and malformed clipboard cannot add code',()=>{const c=generationFixtures()[0];expect(deleteNodes(c,[c.nodes[0].id]).nodes.find(n=>n.type==='button')?.href).toBeNull();expect(decodeNodes('foreign clipboard')).toEqual([]);expect(decodeNodes('Sketch2Site/CanvasNodes/v1:[{"script":"evil"}]')).toEqual([]);});

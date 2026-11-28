export type D1={prepare(sql:string):{bind(...values:unknown[]):{run():Promise<{meta:{changes?:number}}>;first<T>():Promise<T|null>}}};
export type SitesEnv=Record<string,unknown>&{DB?:D1};
// Sites dispatch owns these headers and strips untrusted caller identity. Never expose this Worker outside dispatch.
// Email from get_site's confirmed sole owner is used only to bootstrap the durable Site-scoped subject.
export async function authenticatedOwner(request:Request,env:SitesEnv):Promise<string|null>{
 const subject=request.headers.get('oai-authenticated-user-id');
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 return bindVerifiedOwner(env, subject, email);
}

export async function bindVerifiedOwner(env:SitesEnv, subject:string|null, email:string|undefined, bindingId = "owner"):Promise<string|null>{
 const expected=typeof env.SKETCH_AI_OWNER_EMAIL==='string'?env.SKETCH_AI_OWNER_EMAIL.trim().toLowerCase():'';
 if(!subject||subject.length>200||!expected||!env.DB)return null;
 try {
  const current=await env.DB.prepare('SELECT user_id FROM sketch_ai_owner WHERE id = ?').bind(bindingId).first<{user_id:string}>();
  if(current)return current.user_id===subject?subject:null;
  if(!email||email!==expected)return null;
  await env.DB.prepare('INSERT INTO sketch_ai_owner (id,user_id,enrolled_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(bindingId,subject,Date.now()).run();
  const stored=await env.DB.prepare('SELECT user_id FROM sketch_ai_owner WHERE id = ?').bind(bindingId).first<{user_id:string}>();
  return stored?.user_id===subject?subject:null;
 }catch{return null;}
}

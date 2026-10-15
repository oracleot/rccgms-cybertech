const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function load(file, mocks) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  new Function('require','exports',code)(name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(path.join(root,name.slice(2)+'.ts'),mocks) : require(name), exports)
  return exports
}
const tables = load(path.join(root,'lib/parish/table-registry.ts'),{}).PARISH_SCOPED_TABLES
const slugs = Object.values(load(path.join(root,'lib/features/types.ts'),{}).FEATURE_SLUGS)
function fixture() {
  const names=['joelogunniyi07','damiuxcodes','akinwunmi.awoyode','doduronbi','rccgms.cybertech','other']
  return {profiles:names.map((n,i)=>({id:'p'+i,auth_user_id:'u'+i,email:n+'@example.test',name:i===4?'RCCGMS':n,role:i===0?'developer':'member'})),organisations:[{id:'org',slug:'rccg',status:'active'}],parishes:[],organisation_aliases:[],parish_memberships:[],features:slugs.map(slug=>({id:slug,slug})),parish_feature_entitlements:[],...Object.fromEntries(tables.map(t=>[t,[{id:t+'1',parish_id:null}]]))}
}
function client(db, fail) {
 return { from(table) {
  let op='read',values, options={}, filters=[], single=false, range
  const q={
   select(_cols,opts){options={...options,...opts};return q},
   eq(k,v){filters.push(r=>r[k]===v);return q},
   neq(k,v){filters.push(r=>r[k]!==v);return q},
   is(k,v){filters.push(r=>r[k]===v);return q},
   not(k,_op,v){filters.push(r=>r[k]!==v);return q},
   limit(n){range=[0,n-1];return q}, range(a,b){range=[a,b];return q}, order(){return q},
   single(){single=true;return q},maybeSingle(){single=true;return q},
   insert(v,opts){op='insert';values=v;options={...options,...opts};return q},
   upsert(v,opts){op='upsert';values=v;options={...options,...opts};return q},
   update(v,opts){op='update';values=v;options={...options,...opts};return q},
   then(resolve,reject){return Promise.resolve().then(()=>{
    if(fail?.(table,op)) return {data:null,error:{message:'injected '+table},count:null}
    if(!db[table]) return {data:null,error:{message:'missing table '+table},count:null}
    let rows=db[table].filter(r=>filters.every(f=>f(r)))
    if(op==='update') rows.forEach(r=>Object.assign(r,values))
    if(op==='insert'||op==='upsert') rows=(Array.isArray(values)?values:[values]).map(v=>{
     const keys=(options.onConflict||'id').split(',')
     let old=op==='upsert'&&db[table].find(r=>keys.every(k=>r[k]===v[k]))
     if(old){if(!options.ignoreDuplicates)Object.assign(old,v);return old}
     const row={id:table+db[table].length,...v}; db[table].push(row);return row
    })
    const count=rows.length
    if(range)rows=rows.slice(range[0],range[1]+1)
    return {data:options.head?null:single?(rows[0]||null):rows,error:null,count}
   }).then(resolve,reject)}
  };return q
 }}
}
async function invoke(db,opts={}) {
 const admin=client(db,opts.fail)
 const auth=client(db)
 auth.auth={getUser:async()=>({data:{user:opts.anonymous?null:{id:'u0'}},error:null})}
 const mocks={
  'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
  '@/lib/supabase/admin':{createAdminClient:()=>admin},
  '@/lib/supabase/server':{createClient:async()=>auth},
  '@/lib/maintenance':{isMaintenanceMode:()=>opts.maintenance!==false},
 }
 const {POST}=load(path.join(root,'app/api/admin/developer/parish-bootstrap/route.ts'),mocks)
 return POST()
}
;(async()=>{
 const db=fixture()
 const result=await invoke(db)
 assert.equal(result.status,200)
 assert.equal(db.parish_memberships.length,6,'retry after organisation creation must finish memberships')
 assert.deepEqual(db.parish_memberships.map(m=>m.role),['operator','operator','leader','leader','parish_admin','member'])
 assert.ok(tables.every(t=>db[t].every(r=>r.parish_id)))
 assert.equal(db.parish_feature_entitlements.length,13)
 const snapshot=JSON.stringify(db)
 assert.equal((await invoke(db)).status,200)
 assert.equal(JSON.stringify(db),snapshot,'completed retry must be a no-op')
 for(const broken of ['organisation_aliases','parish_memberships',...tables,'parish_feature_entitlements']) {
  const partial=fixture();let failed=false
  const result=await invoke(partial,{fail:(t,op)=>{if(t===broken&&op!=='read'&&!failed){failed=true;return true}return false}})
  assert.equal(result.status,500,broken+' returned error must fail closed')
  assert.ok(result.body.steps.some(s=>s.status==='failed'),broken+' per-step failure')
  assert.equal((await invoke(partial)).status,200,broken+' retry')
  assert.equal(partial.parish_memberships.length,6)
 }
 const missing=fixture();missing.profiles=missing.profiles.filter(p=>p.id!=='p2')
 assert.equal((await invoke(missing)).status,500)
 assert.equal(missing.parishes.length,0,'missing named user must fail before writes')
 assert.equal((await invoke(fixture(),{anonymous:true})).status,401)
 const member=fixture();member.profiles[0].role='member'
 assert.equal((await invoke(member)).status,403)
 assert.equal((await invoke(fixture(),{maintenance:false})).status,409)
 console.log('PASS: partial recovery, no-op retry, exact roles, all backfills and entitlements, returned errors, missing identities, auth and maintenance gates')
})().catch(e=>{console.error(e);process.exitCode=1})

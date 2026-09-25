/* LogiSuite compatibility layer — v42
 * Brings the web UI/functionality closer to the desktop reference without
 * replacing the existing calculation engine. Loaded after app.js.
 */
(function(){
  'use strict';

  const C=window.LOGISUITE_CONFIG||{};
  const sbx=window.logiSupabase || ((window.supabase?.createClient&&C.SUPABASE_URL&&C.SUPABASE_PUBLISHABLE_KEY)
    ? window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
    : null);
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=x=>String(x??'').trim().toUpperCase().replace(/\s+/g,' ');
  const num=x=>{const n=parseFloat(String(x??'').replace(/[$,]/g,''));return Number.isFinite(n)?n:0};
  const toast=(m,good=true)=>window.toast?window.toast(m,good):alert(m);
  const localType=t=>norm(t)==='LOCAL DELIVERY'||norm(t).includes('LOCAL');

  const legacy={
    bindQuote:window.bindQuote,
    bindQuotes:window.bindQuotes,
    loadQuotes:window.loadQuotes,
    bindLocal:window.bindLocal,
    editLocalDelivery:window.editLocalDelivery,
    bindCrud:window.bindCrud,
    editCrud:window.editCrud,
    updateRecordId:window.updateRecordId,
    selectCustomer:window.selectCustomer,
    payloadFromCart:window.payloadFromCart,
    openPreview:window.openPreview,
    editQuote:window.editQuote,
    deleteQuote:window.deleteQuote,
    openReportsModal:window.openReportsModal,
    openExportModal:window.openExportModal
  };

  function parseDate(v){
    const s=String(v||'').trim();
    let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(m)return new Date(+m[3],+m[2]-1,+m[1]);
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m)return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{2})-(\d{2})-(\d{4})$/); if(m)return new Date(+m[3],+m[2]-1,+m[1]);
    return null;
  }
  function dateISO(v){const d=parseDate(v);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function dateDMY(v){const d=parseDate(v);return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:''}
  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

  async function allRows(table,select='*'){
    if(!sbx)return [];
    const out=[]; const page=1000;
    for(let from=0;;from+=page){
      const {data,error}=await sbx.from(table).select(select).range(from,from+page-1);
      if(error)throw error;
      const rows=data||[]; out.push(...rows); if(rows.length<page)break;
    }
    return out;
  }

  function replaceButton(id,handler){
    const el=document.getElementById(id); if(!el)return;
    const clone=el.cloneNode(true); el.replaceWith(clone); clone.addEventListener('click',e=>{e.preventDefault();handler(e)});
    return clone;
  }

  function ensureCompatCss(){
    if(document.getElementById('logi-compat-css'))return;
    const st=document.createElement('style'); st.id='logi-compat-css';
    st.textContent=`
      .compat-toolbar{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;align-items:end}
      .compat-toolbar>*{min-width:0}.compat-span-2{grid-column:span 2}.compat-span-3{grid-column:span 3}.compat-span-4{grid-column:span 4}.compat-span-6{grid-column:span 6}.compat-span-12{grid-column:1/-1}
      .compat-select-multi{min-height:42px}.compat-filter-wrap{position:relative}.compat-filter-btn{width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .compat-filter-menu{position:absolute;z-index:1055;left:0;right:0;top:calc(100% + 4px);max-height:260px;overflow:auto;background:var(--bs-body-bg,#fff);border:1px solid rgba(127,127,127,.35);border-radius:12px;padding:8px;box-shadow:0 18px 50px rgba(0,0,0,.18)}
      .compat-filter-menu label{display:flex;gap:8px;align-items:center;padding:7px;border-radius:8px}.compat-filter-menu label:hover{background:rgba(142,121,232,.10)}
      .compat-report-meta{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.compat-badge{padding:5px 9px;border-radius:999px;background:rgba(142,121,232,.12);font-size:12px;font-weight:700}
      .compat-modal-xl .modal-dialog{max-width:min(1600px,96vw)}.compat-modal-xl .modal-body{padding:16px}.compat-scroll{max-height:58vh;overflow:auto}
      .compat-action-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.compat-action-row .btn{white-space:nowrap}
      .compat-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.compat-form-grid .full{grid-column:1/-1}
      .compat-rows-head,.compat-row{display:grid;grid-template-columns:90px 120px 120px 120px 1fr 44px;gap:8px;align-items:center}.compat-rows-head{font-weight:800;font-size:12px;margin-bottom:6px}.compat-row{margin-bottom:7px}
      .compat-config-preview{min-height:58px}.compat-small{font-size:12px}.compat-muted{opacity:.72}
      .compat-report-table table,.compat-details-table table{min-width:980px}.compat-report-table th,.compat-report-table td,.compat-details-table th,.compat-details-table td{vertical-align:middle}
      @media(max-width:900px){.compat-toolbar{grid-template-columns:1fr 1fr}.compat-span-2,.compat-span-3,.compat-span-4,.compat-span-6{grid-column:span 1}.compat-span-12{grid-column:1/-1}.compat-form-grid{grid-template-columns:1fr}.compat-rows-head,.compat-row{grid-template-columns:70px 1fr 1fr 1fr 1fr 38px}}
    `;
    document.head.appendChild(st);
  }

  function formatTime12(d=new Date()){
    return new Intl.DateTimeFormat('es-CO',{hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(d).replace(/a\.\s*m\./i,'AM').replace(/p\.\s*m\./i,'PM');
  }

  /* Desktop-equivalent record id: ddMMyy_quoteP + first four chars of PRODUCT. */
  function compatUpdateRecordId(){
    const qdate=String($('#qdate')?.value||'').trim();
    const q=String($('#qnum')?.value||'').trim().replace(/\s/g,'');
    const prod=String($('#pname')?.value||'').trim().replace(/\s/g,'');
    const qty=String($('#pqty')?.value||'').trim();
    const d=parseDate(qdate); const dd=d?`${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`:'';
    const e=$('#record-id'); if(e)e.value=dd&&q&&prod&&qty?`${dd}_${q}P${prod.slice(0,4).toUpperCase()}${qty}`:'';
  }
  window.updateRecordId=compatUpdateRecordId;

  /* Local Delivery: use effective-dated history, just like the desktop app. */
  let ldSyncSeq=0;
  async function syncHistoricalLdCost(){
    if(!sbx)return;
    const type=$('#qtype')?.value||''; if(!localType(type))return;
    const company=$('#qcompany')?.value?.trim()||'', address=$('#qaddress')?.value?.trim()||'', qd=parseDate($('#qdate')?.value||'');
    if(!company||!address||!qd)return;
    const seq=++ldSyncSeq;
    try{
      const rows=await allRows('local_delivery_cost_history','id,company_name,address,date,cost_1,cost_extra');
      if(seq!==ldSyncSeq)return;
      const eligible=rows.map(r=>({...r,_d:parseDate(r.date)})).filter(x=>x._d&&x._d<=qd&&norm(x.company_name)===norm(company)&&norm(x.address)===norm(address));
      eligible.sort((a,b)=>b._d-a._d||num(b.id)-num(a.id));
      const hit=eligible[0];
      if(hit){if($('#ld_cost1'))$('#ld_cost1').value=hit.cost_1??'';if($('#ld_cost_extra'))$('#ld_cost_extra').value=hit.cost_extra??'';}
      else{if($('#ld_cost1'))$('#ld_cost1').value='';if($('#ld_cost_extra'))$('#ld_cost_extra').value='';}
      if(window.calc)window.calc();
    }catch(e){console.warn('Local Delivery history lookup failed',e)}
  }

  const legacySelectCustomer=legacy.selectCustomer;
  if(legacySelectCustomer){
    window.selectCustomer=function(c){
      legacySelectCustomer(c);
      setTimeout(syncHistoricalLdCost,0);
    };
  }

  /* Preserve old payload calculation while fixing ID_REGISTRO to desktop format. */
  if(legacy.payloadFromCart){
    window.payloadFromCart=function(p,g,iid){
      const out=legacy.payloadFromCart(p,g,iid);
      const d=parseDate(g?.date); const dd=d?`${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`:'';
      const prod=String(p?.product||'').trim().replace(/\s/g,'');
      out.id_registro=dd&&g?.quote&&prod?`${dd}_${String(g.quote).replace(/\s/g,'')}P${prod.slice(0,4).toUpperCase()}${p?.qty??''}`:out.id_registro;
      return out;
    };
  }

  async function findQuote(iid){
    for(const table of ['quotes','local_quotes']){
      const {data,error}=await sbx.from(table).select('*').eq('quote_instance_id',iid).order('id');
      if(!error&&data?.length)return {table,rows:data};
    }
    return null;
  }

  function bestTransport(r,best){
    const b=norm(best);
    if(b==='WWE')return r.transport_wwe||'';
    if(b==='CBCFS')return r.transport_cbcfs||'';
    if(b.includes('UBER FREIGHT LTL'))return r.transport_uber_freight_ltl||'';
    if(b==='LOCAL DELIVERY')return 'LOCAL DELIVERY';
    return best||'';
  }
  function actualMinCost(r){
    const pairs=[['WWE','cost_wwe'],['CBCFS','cost_cbcfs'],['UPS','cost_ups'],['FEDEX','cost_fedex'],['UBER FREIGHT TL','cost_uber_freight_tl'],['UBER FREIGHT LTL','cost_uber_freight_ltl'],['LOCAL DELIVERY','cost_local_delivery']]
      .map(([name,key])=>[name,num(r[key])]).filter(x=>x[1]>0);
    if(!pairs.length)return {name:String(r.better_platform||''),cost:num(r.better_cost)};
    pairs.sort((a,b)=>a[1]-b[1]); return {name:pairs[0][0],cost:pairs[0][1]};
  }

  async function compatOpenPreview(iid,mode='SP'){
    if(!sbx)return; const x=await findQuote(iid); if(!x){toast('Cotización no encontrada',false);return}
    const first=x.rows[0], costMode=String(mode).toUpperCase()==='COST';
    const rows=x.rows.map(r=>{
      const best=costMode?actualMinCost(r).name:(r.better_platform||'');
      const price=costMode?actualMinCost(r).cost:num(r.better_shipping_price);
      return {r,best,price};
    });
    const body=`<div class="compat-report-meta"><span class="compat-badge">QUOTE #${esc(first.quote)}</span><span class="compat-badge">${esc(first.date)}</span><span class="compat-badge">${esc(first.type)}</span></div>
      <div class="modal-summary"><div><b>${esc(first.company_name||'')}</b><div class="muted">${esc(first.address||'')}</div><div class="muted">Services: ${esc(first.services||'')}</div></div></div>
      <div class="compat-scroll"><table class="data-table"><thead><tr><th>SKU</th><th>PRODUCT</th><th>QTY</th><th>PRICE/CASE</th><th>REVENUE</th><th>${costMode?'PLATFORM (COST)':'PLATFORM'}</th><th>${costMode?'COST':'SHIPPING PRICE'}</th><th>CONFIGURATION</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.r.sku)}</td><td>${esc(x.r.product)}</td><td>${esc(x.r.qty)}</td><td>$${num(x.r.price_per_case).toFixed(2)}</td><td>${esc(x.r.revenue)}%</td><td>${esc(x.best)}</td><td>$${Number(x.price||0).toFixed(costMode?2:0)}</td><td>${esc(x.r.applied_configuration||'')}</td></tr>`).join('')}</tbody></table></div>`;
    window.openBootstrapModal('compatPreviewModal',`Quote #${first.quote} — ${costMode?'COST':'SP'}`,body,()=>{});
  }
  window.openPreview=compatOpenPreview;

  function sqlLiteral(v){
    if(v===null||v===undefined)return 'NULL';
    if(v instanceof Date)return sqlLiteral(v.toISOString());
    if(typeof v==='number'&&Number.isFinite(v))return String(v);
    if(typeof v==='boolean')return v?'1':'0';
    if(typeof v==='object')return sqlLiteral(JSON.stringify(v));
    return "'" + String(v).replace(/'/g,"''") + "'";
  }
  function sqlIdent(v){return '"' + String(v).replace(/"/g,'""') + '"';}
  function sqlInsert(table,columns,values){
    return 'INSERT INTO '+table+' ('+columns.map(sqlIdent).join(', ')+') VALUES ('+values.map(sqlLiteral).join(', ')+');';
  }
  function ensureTopBackupButton(){
    const top=document.querySelector('.top-actions');if(!top)return;
    const theme=document.getElementById('theme')||top.firstChild||null;
    if(!document.getElementById('backup-local-db')){
      const b=document.createElement('button');b.type='button';b.id='backup-local-db';b.className='btn btn-sm btn-outline-success';b.title='Descargar products.db, quotes.db y rules.db listos para sustituir el sistema local';b.textContent='💾 DB Local';b.onclick=()=>window.downloadLocalDatabaseZip?.();
      top.insertBefore(b,theme);
    }
  }

  async function downloadLocalDatabaseZip(){
    const btn=document.getElementById('backup-local-db'),old=btn?.innerHTML||'💾 DB Local';
    if(btn?.disabled)return;
    if(btn){btn.disabled=true;btn.innerHTML='⏳ Construyendo DB local…'}
    let productDb=null,quoteDb=null,rulesDb=null;
    try{
      if(!sbx||!navigator.onLine){toast('El respaldo local requiere conexión a Supabase.',false);return}
      if(typeof initSqlJs!=='function'){toast('Motor SQLite no disponible. Recarga la página.',false);return}
      if(typeof JSZip==='undefined'){toast('Compresor ZIP no disponible. Recarga la página.',false);return}
      const [products,customers,verified,rules,quotes,local_quotes,ld]=await Promise.all([
        allRows('products'),allRows('customers'),allRows('verified_configs'),allRows('rules'),
        allRows('quotes'),allRows('local_quotes'),allRows('local_delivery_cost_history')
      ]);
      const SQL=await initSqlJs({locateFile:file=>'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/'+file});
      const lit=sqlLiteral,ident=sqlIdent;
      const insertRows=(db,table,cols,rows)=>{
        const stmt=db.prepare('INSERT INTO '+table+' ('+cols.map(ident).join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')');
        db.run('BEGIN;');for(const row of rows)stmt.run(Array.isArray(row)?row:cols.map(k=>row[k]));stmt.free();db.run('COMMIT;');
      };
      const validateDb=(db,expected)=>{for(const [table,n] of Object.entries(expected)){const rs=db.exec('SELECT COUNT(*) FROM '+table);const got=Number(rs?.[0]?.values?.[0]?.[0]??-1);if(got!==n)throw new Error('Validación '+table+': esperaba '+n+' y creó '+got)}};
      productDb=new SQL.Database();
      productDb.run('CREATE TABLE "productos" ("SKU" TEXT,"Lista de Productos" TEXT,"CATEGORÍA" TEXT,"TIPO" TEXT,"PAPER/OZ" TEXT,"COLOR" TEXT,"PRODUCTO" TEXT,"PAQUETE DE CAJAS/UNTLS" TEXT,"PESO" TEXT,"ALTURA" TEXT,"Ti" TEXT,"Hi" TEXT,"TiHi" REAL,"DIMENSIONES" TEXT,"Length" TEXT,"Width" TEXT,"Height in" TEXT,"INFORMACIÓN" TEXT,"NOTA" TEXT);');
      productDb.run('CREATE TABLE "clientes" ("ID Cliente" INTEGER PRIMARY KEY AUTOINCREMENT,"ID" TEXT,"Type" TEXT,"Company or Name" TEXT,"ZIP CODE/ADDRESS" TEXT,"Accesories" TEXT,"Costo LD 1er Pallet" TEXT,"Costo LD Extra" TEXT);');
      productDb.run('CREATE TABLE "verificados" ("FECHA" TEXT,"HORA" TEXT,"LISTA DE PRODUCTOS" TEXT,"CANTIDAD" TEXT,"CONFIGURACIÓN VERIFICADA" TEXT,"MEDIO INFORMATIVO" TEXT,"CATEGORÍA" TEXT,"TIPO" TEXT,"PAQUETE DE CAJAS/UND" TEXT,"DIMENSIONES" TEXT,"NOTAS" TEXT,"ESTADO" TEXT DEFAULT '+lit('VIGENTE')+');');
      productDb.run('CREATE TABLE "local_delivery_cost_history" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT,"ID Cliente" INTEGER,"ID CLIENTE CODE" TEXT,"Type" TEXT DEFAULT '+lit('Local Delivery')+',"Company or Name" TEXT NOT NULL,"ZIP CODE/ADDRESS" TEXT NOT NULL,"DATE" TEXT NOT NULL,"Costo LD 1er Pallet" REAL,"Costo LD Extra" REAL);');
      insertRows(productDb,'"productos"',['SKU','Lista de Productos','CATEGORÍA','TIPO','PAPER/OZ','COLOR','PRODUCTO','PAQUETE DE CAJAS/UNTLS','PESO','ALTURA','Ti','Hi','TiHi','DIMENSIONES','Length','Width','Height in','INFORMACIÓN','NOTA'],products.map(r=>[r.sku,r.product_list,r.category,r.product_type,r.paper_oz,r.color,r.product,r.package_units,r.weight,r.height,r.ti,r.hi,r.tihi,r.dimensions,r.length_in,r.width_in,r.height_in,r.information,r.note]));
      insertRows(productDb,'"clientes"',['ID Cliente','ID','Type','Company or Name','ZIP CODE/ADDRESS','Accesories','Costo LD 1er Pallet','Costo LD Extra'],customers.map(r=>[r.id_cliente,r.id_code,r.type,r.company_name,r.address,r.accessories,r.local_delivery_cost_1,r.local_delivery_cost_extra]));
      insertRows(productDb,'"verificados"',['FECHA','HORA','LISTA DE PRODUCTOS','CANTIDAD','CONFIGURACIÓN VERIFICADA','MEDIO INFORMATIVO','CATEGORÍA','TIPO','PAQUETE DE CAJAS/UND','DIMENSIONES','NOTAS','ESTADO'],verified.map(r=>[r.date,r.time,r.product_list,r.quantity,r.verified_config,r.information_source,r.category,r.product_type,r.package_units,r.dimensions,r.notes,r.status||'VIGENTE']));
      insertRows(productDb,'"local_delivery_cost_history"',['ID','ID Cliente','ID CLIENTE CODE','Type','Company or Name','ZIP CODE/ADDRESS','DATE','Costo LD 1er Pallet','Costo LD Extra'],ld.map(x=>({ID:x.id,'ID Cliente':x.id_cliente,'ID CLIENTE CODE':x.id_cliente_code,Type:x.type||'Local Delivery','Company or Name':x.company_name,'ZIP CODE/ADDRESS':x.address,DATE:x.date,'Costo LD 1er Pallet':x.cost_1,'Costo LD Extra':x.cost_extra})));
      productDb.run('DELETE FROM sqlite_sequence WHERE name IN ('+lit('clientes')+','+lit('local_delivery_cost_history')+');');
      productDb.run('INSERT INTO sqlite_sequence(name,seq) SELECT '+lit('clientes')+',COALESCE(MAX("ID Cliente"),0) FROM "clientes";');
      productDb.run('INSERT INTO sqlite_sequence(name,seq) SELECT '+lit('local_delivery_cost_history')+',COALESCE(MAX("ID"),0) FROM "local_delivery_cost_history";');

      quoteDb=new SQL.Database();
      quoteDb.run('CREATE TABLE "Data_Base_Quotes" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT,"DATE" TEXT,"EMAIL" TEXT,"QUOTE" TEXT,"ZIP CODE/ ADDRESS" TEXT,"COMPANY OR NAME" TEXT,"TYPE" TEXT,"SKU" TEXT,"PRODUCT" TEXT,"QTY" INTEGER,"PRICE PER CASE" REAL,"REVENUE" REAL,"INSURED VALUE" REAL,"BETTER COST" REAL,"BETTER SHIPING PRICE" REAL,"BETTER PLATFORM" TEXT,"APPLIED CONFIGURATION/Detail products" TEXT,"COST WWE" REAL,"SP WWE" REAL,"TRANSPORT WWE" TEXT,"COST UPS" REAL,"SP UPS" REAL,"COST CBCFS" REAL,"SP CBCFS" REAL,"TRANSPORT CBCFS" TEXT,"COST UBER FREIGHT TL" REAL,"SP UBER FREIGHT TL" REAL,"COST UBER FREIGHT LTL" REAL,"SP UBER FREIGHT LTL" REAL,"TRANSPORT UBER FREIGHT LTL" TEXT,"COST FEDEX" REAL,"SP FEDEX" REAL,"COST LOCAL DELIVERY" REAL,"SP LOCAL DELIVERY" REAL,"NOTA" TEXT,"SERVICES" TEXT,"ID_REGISTRO" TEXT,"FORM_STATE" TEXT,"QUOTE_INSTANCE_ID" TEXT);');
      quoteDb.run('CREATE TABLE "Data_Base_Local_Quotes" ("ID" INTEGER PRIMARY KEY AUTOINCREMENT,"ID_REGISTRO" TEXT,"DATE" TEXT,"EMAIL" TEXT,"QUOTE" TEXT,"ZIP CODE/ ADDRESS" TEXT,"COMPANY OR NAME" TEXT,"TYPE" TEXT,"SKU" TEXT,"PRODUCT" TEXT,"QTY" INTEGER,"PRICE PER CASE" REAL,"REVENUE" REAL,"INSURED VALUE" REAL,"BETTER COST" REAL,"BETTER SHIPING PRICE" REAL,"BETTER PLATFORM" TEXT,"APPLIED CONFIGURATION/Detail products" TEXT,"COST WWE" REAL,"SP WWE" REAL,"TRANSPORT WWE" TEXT,"COST UPS" REAL,"SP UPS" REAL,"TRANSPORT UPS" TEXT,"COST CBCFS" REAL,"SP CBCFS" REAL,"TRANSPORT CBCFS" TEXT,"COST UBER FREIGHT TL" REAL,"SP UBER FREIGHT TL" REAL,"COST UBER FREIGHT LTL" REAL,"SP UBER FREIGHT LTL" REAL,"TRANSPORT UBER FREIGHT LTL" TEXT,"COST FEDEX" REAL,"SP FEDEX" REAL,"COST LOCAL DELIVERY" REAL,"SP LOCAL DELIVERY" REAL,"SERVICES" TEXT,"NOTA" TEXT,"PALLETS REQUIRED" REAL,"COST OF PALLET 1" REAL,"COST OF EXTRA PALLETS" REAL,"FORM_STATE" TEXT,"QUOTE_INSTANCE_ID" TEXT);');
      quoteDb.run('CREATE TABLE "cotizaciones" ("ID_REGISTRO" TEXT,"DATE" TEXT,"EMAIL" TEXT,"#QUOTE" TEXT,"ZIP/ADDRESS" TEXT,"COMPANY OR NAME" TEXT,"TYPE" TEXT,"SKU" TEXT,"PRODUCT" TEXT,"QTY" TEXT,"PRICE PER CASE" TEXT,"REVENUE" TEXT,"INSURED VALUE" TEXT,"BETTER COST" TEXT,"BETTER SHIPPING PRICE" TEXT,"BETTER PLATFORM" TEXT,"APPLIED CONFIGURATION" TEXT,"COST WWE" TEXT,"SP WWE" TEXT,"COST UPS" TEXT,"SP UPS" TEXT,"COST CBCFS" TEXT,"SP CBCFS" TEXT,"COST FEDEX" TEXT,"SP FEDEX" TEXT,"COST UBER FREIGHT TL" TEXT,"SP UBER FREIGHT TL" TEXT,"COST UBER FREIGHT LTL" TEXT,"SP UBER FREIGHT LTL" TEXT,"COST LOCAL DELIVERY" TEXT,"SP LOCAL DELIVERY" TEXT,"SERVICES" TEXT);');
      const qRows=quotes.map(r=>({ID:r.id,DATE:r.date,EMAIL:r.email,QUOTE:r.quote,'ZIP CODE/ ADDRESS':r.address,'COMPANY OR NAME':r.company_name,TYPE:r.type,SKU:r.sku,PRODUCT:r.product,QTY:r.qty,'PRICE PER CASE':r.price_per_case,REVENUE:r.revenue,'INSURED VALUE':r.insured_value,'BETTER COST':r.better_cost,'BETTER SHIPING PRICE':r.better_shipping_price,'BETTER PLATFORM':r.better_platform,'APPLIED CONFIGURATION/Detail products':r.applied_configuration,'COST WWE':r.cost_wwe,'SP WWE':r.sp_wwe,'TRANSPORT WWE':r.transport_wwe,'COST UPS':r.cost_ups,'SP UPS':r.sp_ups,'COST CBCFS':r.cost_cbcfs,'SP CBCFS':r.sp_cbcfs,'TRANSPORT CBCFS':r.transport_cbcfs,'COST UBER FREIGHT TL':r.cost_uber_freight_tl,'SP UBER FREIGHT TL':r.sp_uber_freight_tl,'COST UBER FREIGHT LTL':r.cost_uber_freight_ltl,'SP UBER FREIGHT LTL':r.sp_uber_freight_ltl,'TRANSPORT UBER FREIGHT LTL':r.transport_uber_freight_ltl,'COST FEDEX':r.cost_fedex,'SP FEDEX':r.sp_fedex,'COST LOCAL DELIVERY':r.cost_local_delivery,'SP LOCAL DELIVERY':r.sp_local_delivery,NOTA:r.nota,SERVICES:r.services,ID_REGISTRO:r.id_registro,FORM_STATE:r.form_state&&typeof r.form_state==='object'?JSON.stringify(r.form_state):r.form_state,QUOTE_INSTANCE_ID:r.quote_instance_id}));
      const lRows=local_quotes.map(r=>({ID:r.id,ID_REGISTRO:r.id_registro,DATE:r.date,EMAIL:r.email,QUOTE:r.quote,'ZIP CODE/ ADDRESS':r.address,'COMPANY OR NAME':r.company_name,TYPE:r.type,SKU:r.sku,PRODUCT:r.product,QTY:r.qty,'PRICE PER CASE':r.price_per_case,REVENUE:r.revenue,'INSURED VALUE':r.insured_value,'BETTER COST':r.better_cost,'BETTER SHIPING PRICE':r.better_shipping_price,'BETTER PLATFORM':r.better_platform,'APPLIED CONFIGURATION/Detail products':r.applied_configuration,'COST WWE':r.cost_wwe,'SP WWE':r.sp_wwe,'TRANSPORT WWE':r.transport_wwe,'COST UPS':r.cost_ups,'SP UPS':r.sp_ups,'TRANSPORT UPS':r.transport_ups,'COST CBCFS':r.cost_cbcfs,'SP CBCFS':r.sp_cbcfs,'TRANSPORT CBCFS':r.transport_cbcfs,'COST UBER FREIGHT TL':r.cost_uber_freight_tl,'SP UBER FREIGHT TL':r.sp_uber_freight_tl,'COST UBER FREIGHT LTL':r.cost_uber_freight_ltl,'SP UBER FREIGHT LTL':r.sp_uber_freight_ltl,'TRANSPORT UBER FREIGHT LTL':r.transport_uber_freight_ltl,'COST FEDEX':r.cost_fedex,'SP FEDEX':r.sp_fedex,'COST LOCAL DELIVERY':r.cost_local_delivery,'SP LOCAL DELIVERY':r.sp_local_delivery,SERVICES:r.services,NOTA:r.nota,'PALLETS REQUIRED':r.pallets_required,'COST OF PALLET 1':r.cost_of_pallet_1,'COST OF EXTRA PALLETS':r.cost_of_extra_pallets,FORM_STATE:r.form_state&&typeof r.form_state==='object'?JSON.stringify(r.form_state):r.form_state,QUOTE_INSTANCE_ID:r.quote_instance_id}));
      const qCols=['ID','DATE','EMAIL','QUOTE','ZIP CODE/ ADDRESS','COMPANY OR NAME','TYPE','SKU','PRODUCT','QTY','PRICE PER CASE','REVENUE','INSURED VALUE','BETTER COST','BETTER SHIPING PRICE','BETTER PLATFORM','APPLIED CONFIGURATION/Detail products','COST WWE','SP WWE','TRANSPORT WWE','COST UPS','SP UPS','COST CBCFS','SP CBCFS','TRANSPORT CBCFS','COST UBER FREIGHT TL','SP UBER FREIGHT TL','COST UBER FREIGHT LTL','SP UBER FREIGHT LTL','TRANSPORT UBER FREIGHT LTL','COST FEDEX','SP FEDEX','COST LOCAL DELIVERY','SP LOCAL DELIVERY','NOTA','SERVICES','ID_REGISTRO','FORM_STATE','QUOTE_INSTANCE_ID'];
      const lCols=['ID','ID_REGISTRO','DATE','EMAIL','QUOTE','ZIP CODE/ ADDRESS','COMPANY OR NAME','TYPE','SKU','PRODUCT','QTY','PRICE PER CASE','REVENUE','INSURED VALUE','BETTER COST','BETTER SHIPING PRICE','BETTER PLATFORM','APPLIED CONFIGURATION/Detail products','COST WWE','SP WWE','TRANSPORT WWE','COST UPS','SP UPS','TRANSPORT UPS','COST CBCFS','SP CBCFS','TRANSPORT CBCFS','COST UBER FREIGHT TL','SP UBER FREIGHT TL','COST UBER FREIGHT LTL','SP UBER FREIGHT LTL','TRANSPORT UBER FREIGHT LTL','COST FEDEX','SP FEDEX','COST LOCAL DELIVERY','SP LOCAL DELIVERY','SERVICES','NOTA','PALLETS REQUIRED','COST OF PALLET 1','COST OF EXTRA PALLETS','FORM_STATE','QUOTE_INSTANCE_ID'];
      insertRows(quoteDb,'"Data_Base_Quotes"',qCols,qRows);insertRows(quoteDb,'"Data_Base_Local_Quotes"',lCols,lRows);
      const legacyCols=['ID_REGISTRO','DATE','EMAIL','#QUOTE','ZIP/ADDRESS','COMPANY OR NAME','TYPE','SKU','PRODUCT','QTY','PRICE PER CASE','REVENUE','INSURED VALUE','BETTER COST','BETTER SHIPPING PRICE','BETTER PLATFORM','APPLIED CONFIGURATION','COST WWE','SP WWE','COST UPS','SP UPS','COST CBCFS','SP CBCFS','COST FEDEX','SP FEDEX','COST UBER FREIGHT TL','SP UBER FREIGHT TL','COST UBER FREIGHT LTL','SP UBER FREIGHT LTL','COST LOCAL DELIVERY','SP LOCAL DELIVERY','SERVICES'];
      const legacyRows=[...quotes,...local_quotes].sort((a,b)=>num(a.id)-num(b.id)).map(r=>[r.id_registro,r.date,r.email,r.quote,r.address,r.company_name,r.type,r.sku,r.product,r.qty,r.price_per_case,r.revenue,r.insured_value,r.better_cost,r.better_shipping_price,r.better_platform,r.applied_configuration,r.cost_wwe,r.sp_wwe,r.cost_ups,r.sp_ups,r.cost_cbcfs,r.sp_cbcfs,r.cost_fedex,r.sp_fedex,r.cost_uber_freight_tl,r.sp_uber_freight_tl,r.cost_uber_freight_ltl,r.sp_uber_freight_ltl,r.cost_local_delivery,r.sp_local_delivery,r.services]);
      const legacyStmt=quoteDb.prepare('INSERT INTO "cotizaciones" ('+legacyCols.map(ident).join(',')+') VALUES ('+legacyCols.map(()=>'?').join(',')+')');quoteDb.run('BEGIN;');for(const v of legacyRows)legacyStmt.run(v);legacyStmt.free();quoteDb.run('COMMIT;');
      quoteDb.run('DELETE FROM sqlite_sequence WHERE name IN ('+lit('Data_Base_Quotes')+','+lit('Data_Base_Local_Quotes')+');');
      quoteDb.run('INSERT INTO sqlite_sequence(name,seq) SELECT '+lit('Data_Base_Quotes')+',COALESCE(MAX("ID"),0) FROM "Data_Base_Quotes";');
      quoteDb.run('INSERT INTO sqlite_sequence(name,seq) SELECT '+lit('Data_Base_Local_Quotes')+',COALESCE(MAX("ID"),0) FROM "Data_Base_Local_Quotes";');

      rulesDb=new SQL.Database();
      rulesDb.run('CREATE TABLE "reglas" ("ID Regla" INTEGER PRIMARY KEY AUTOINCREMENT,"Estado" TEXT DEFAULT '+lit('ACTIVA')+',"Fecha" TEXT,"Categoría" TEXT,"Criterio de Búsqueda" TEXT,"Descripción" TEXT,"Sede / Ubicación" TEXT,"Modo de Envío" TEXT,"Carriers Permitidos" TEXT,"Umbral UPS (Máx. Cajas)" TEXT,"Revenue" TEXT,"Requiere Validación" TEXT,"NOTA" TEXT);');
      insertRows(rulesDb,'"reglas"',['ID Regla','Estado','Fecha','Categoría','Criterio de Búsqueda','Descripción','Sede / Ubicación','Modo de Envío','Carriers Permitidos','Umbral UPS (Máx. Cajas)','Revenue','Requiere Validación','NOTA'],rules.map(r=>[r.id_regla,r.estado||'ACTIVA',r.fecha,r.categoria,r.criterio_busqueda,r.descripcion,r.sede_ubicacion,r.modo_envio,r.carriers_permitidos,r.umbral_ups,r.revenue,r.requiere_validacion,r.nota]));
      rulesDb.run('DELETE FROM sqlite_sequence WHERE name='+lit('reglas')+';');rulesDb.run('INSERT INTO sqlite_sequence(name,seq) SELECT '+lit('reglas')+',COALESCE(MAX("ID Regla"),0) FROM "reglas";');validateDb(productDb,{'"productos"':products.length,'"clientes"':customers.length,'"verificados"':verified.length,'"local_delivery_cost_history"':ld.length});
      validateDb(quoteDb,{'"Data_Base_Quotes"':quotes.length,'"Data_Base_Local_Quotes"':local_quotes.length,'"cotizaciones"':quotes.length+local_quotes.length});
      validateDb(rulesDb,{'"reglas"':rules.length});

      const zip=new JSZip(),stamp=new Date(),ds=stamp.getFullYear()+String(stamp.getMonth()+1).padStart(2,'0')+String(stamp.getDate()).padStart(2,'0')+'_'+String(stamp.getHours()).padStart(2,'0')+String(stamp.getMinutes()).padStart(2,'0')+String(stamp.getSeconds()).padStart(2,'0');
      zip.file('databases/products.db',productDb.export());zip.file('databases/quotes.db',quoteDb.export());zip.file('databases/rules.db',rulesDb.export());
      zip.file('LEEME_RESTAURACION.txt',['LOGISUITE — RESTAURACIÓN DE BASE LOCAL','','1. Cierra completamente LogiSuite de escritorio.','2. Haz una copia de seguridad de la carpeta databases.','3. Extrae este ZIP.','4. Reemplaza products.db, quotes.db y rules.db dentro de la carpeta databases.','5. Abre LogiSuite de escritorio.','','Este contenido representa el estado de Supabase al momento de la descarga.','','Products: '+products.length,'Customers: '+customers.length,'Verified: '+verified.length,'Rules: '+rules.length,'Quotes: '+quotes.length,'Local Quotes: '+local_quotes.length,'Local Delivery History: '+ld.length].join('\n'));
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      downloadFile('LogiSuite_Local_DB_'+ds+'.zip',blob);
      toast('DB local lista para reemplazar · '+(products.length+customers.length+verified.length+rules.length+quotes.length+local_quotes.length+ld.length).toLocaleString()+' registros');
    }catch(e){console.error(e);toast('No se pudo generar la DB local: '+e.message,false)}
    finally{try{productDb?.close();quoteDb?.close();rulesDb?.close()}catch(_){}if(btn){btn.innerHTML=old;btn.disabled=false}}
  }
  window.downloadLocalDatabaseZip=downloadLocalDatabaseZip;

  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();
  }

  function detailsColumns(mode){
    const base=['Product','Qty','Revenue','BEST PLATFORM',mode==='cost'?'BEST COST':'BEST PRICE','CONFIGURATION','TRANSPORT'];
    const cost=['COST WWE','COST UPS','COST CBCFS','COST FEDEX','COST UF LTL','COST UF TL'];
    const price=['PRICE WWE','PRICE UPS','PRICE CBCFS','PRICE FEDEX','PRICE UF LTL','PRICE UF TL'];
    return mode==='price'?[...base,...price]:mode==='cost'?[...base,...cost]:[...base,...cost,...price];
  }
  function detailsRow(r,mode){
    const best=String(r.better_platform||'');
    const vals={
      Product:r.product,Qty:r.qty,Revenue:r.revenue,'BEST PLATFORM':best,'BEST PRICE':r.better_shipping_price,'BEST COST':r.better_cost,
      CONFIGURATION:r.applied_configuration,TRANSPORT:bestTransport(r,best),
      'COST WWE':r.cost_wwe,'COST UPS':r.cost_ups,'COST CBCFS':r.cost_cbcfs,'COST FEDEX':r.cost_fedex,'COST UF LTL':r.cost_uber_freight_ltl,'COST UF TL':r.cost_uber_freight_tl,
      'PRICE WWE':r.sp_wwe,'PRICE UPS':r.sp_ups,'PRICE CBCFS':r.sp_cbcfs,'PRICE FEDEX':r.sp_fedex,'PRICE UF LTL':r.sp_uber_freight_ltl,'PRICE UF TL':r.sp_uber_freight_tl
    };
    return vals;
  }

  async function compatOpenDetails(iid){
    if(!sbx)return; const x=await findQuote(iid); if(!x){toast('Cotización no encontrada',false);return}
    const first=x.rows[0]; let mode='price';
    const build=()=>{
      const cols=detailsColumns(mode), rows=x.rows.map(detailsRow);
      const thead=cols.map(c=>`<th>${esc(c)}</th>`).join('');
      const tbody=rows.map(row=>`<tr>${cols.map(c=>`<td>${esc(row[c]??'')}</td>`).join('')}</tr>`).join('');
      const title=mode==='price'?'PRICE DETAILS':mode==='cost'?'COST DETAILS':'FULL DETAILS';
      const dataForClipboard=[`QUOTE #${first.quote}`,`Date: ${first.date}`,`Customer: ${first.company_name||''}`,`Address: ${first.address||''}`,`Services: ${first.services||''}`,'',title,'',cols.join(' | '),...rows.map(r=>cols.map(c=>r[c]??'').join(' | '))].join('\n');
      const html=`<div class="compat-report-meta"><span class="compat-badge">${esc(first.date)}</span><span class="compat-badge">QUOTE #${esc(first.quote)}</span><span class="compat-badge">${esc(first.company_name||'')}</span><span class="compat-badge">${esc(first.type||'')}</span></div>
      <div class="compat-action-row" style="margin-bottom:10px"><button type="button" class="btn ${mode==='price'?'primary':'secondary'}" data-detail-mode="price">Price Details</button><button type="button" class="btn ${mode==='cost'?'primary':'secondary'}" data-detail-mode="cost">Cost Details</button><button type="button" class="btn ${mode==='full'?'primary':'secondary'}" data-detail-mode="full">Full Details</button><span style="flex:1"></span><button type="button" class="btn success" id="detail-copy">Copy Email</button><button type="button" class="btn success" id="detail-xlsx">Download Excel</button><button type="button" class="btn danger" id="detail-pdf">Preview PDF</button></div>
      <div class="compat-scroll compat-details-table"><table class="data-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
      const modal=$('#compatDetailsModal .modal-body'); if(!modal)return; modal.innerHTML=html;
      modal.querySelectorAll('[data-detail-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.detailMode;build()});
      $('#detail-copy').onclick=()=>copyText(dataForClipboard).then(()=>toast('Detalles copiados al portapapeles')).catch(()=>toast('No se pudo copiar',false));
      $('#detail-xlsx').onclick=()=>downloadXlsx(`Quote_${first.quote}_${mode}`,rows,cols);
      $('#detail-pdf').onclick=()=>printReport(title,`DATE: ${first.date} | CUSTOMER: ${first.company_name||''}`,rows.map(r=>Object.fromEntries(cols.map(c=>[c,r[c]??'']))));
    };
    window.openBootstrapModal('compatDetailsModal',`Quote Details #${first.quote}`,`<div id="compat-details-host"></div>`,()=>build());
  }

  async function compatDeleteQuote(iid){
    if(!navigator.onLine){toast('Eliminar cotizaciones requiere conexión.',false);return}
    if(!confirm('¿Está segura de eliminar esta cotización?'))return;
    if(!sbx)return;
    const x=await findQuote(iid); if(!x){toast('Cotización no encontrada',false);return}
    const {data:otherRows}=await sbx.from(x.table==='quotes'?'local_quotes':'quotes').select('*').eq('quote_instance_id',iid);
    const tables=[x.table, ...(otherRows?.length?[x.table==='quotes'?'local_quotes':'quotes']:[])];
    let deleted=[];
    for(const t of tables){
      const res=await sbx.from(t).delete().eq('quote_instance_id',iid);
      if(res.error){
        for(const d of deleted){
          if(d.rows?.length)await sbx.from(d.table).insert(d.rows);
        }
        toast('No se pudo completar la eliminación. La cotización se conservó.',false);return
      }
      const rows=t===x.table?x.rows:(otherRows||[]);
      if(rows?.length)deleted.push({table:t,rows});
    }
    toast('Cotización eliminada'); await compatLoadQuotes();
  }
  window.deleteQuote=compatDeleteQuote;


  function ensureQuoteToolbar(){
    const host=$('#quotes-table');if(!host)return null;
    let t=document.getElementById('compat-quote-toolbar');
    const old=host.parentElement.querySelector('.between');
    if(!t){t=document.createElement('div');t.id='compat-quote-toolbar';t.className='compat-db-toolbar';if(old)old.replaceWith(t);else host.parentElement.insertBefore(t,host)}
    return t
  }
  async function compatLoadQuotes(){
    if(!sbx)return;const host=$('#quotes-table');if(!host)return;dbEnsureCss();
    dbPager.quotes=dbPager.quotes||{page:0,size:25,q:'',from:'',to:'',type:'',sort:'-date'};const st=dbPager.quotes;
    try{
      const data=await Promise.all([allRows('quotes','quote_instance_id,date,quote,company_name,address,type,product'),allRows('local_quotes','quote_instance_id,date,quote,company_name,address,type,product')]);
      let rows=[...data[0],...data[1]];const groups=new Map();rows.forEach(r=>{const k=String(r.quote_instance_id||('LEGACY|'+r.quote+'|'+r.date+'|'+r.company_name+'|'+r.address+'|'+r.type));if(!groups.has(k))groups.set(k,r)});rows=[...groups.values()];
      const types=[...new Set(rows.map(r=>String(r.type||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
      const t=ensureQuoteToolbar();
      t.innerHTML='<label class="compat-db-field compat-db-search"><span class="label">Search</span><input id="vq" class="input" placeholder="Quote, company, address or product" value="'+esc(st.q)+'"></label><label class="compat-db-field"><span class="label">From</span><input id="vf" class="input" type="date" value="'+esc(st.from)+'"></label><label class="compat-db-field"><span class="label">To</span><input id="vt" class="input" type="date" value="'+esc(st.to)+'"></label><label class="compat-db-field"><span class="label">Type</span><select id="vq-type" class="select"><option value="">All</option>'+types.map(x=>'<option value="'+esc(x)+'"'+(norm(st.type)===norm(x)?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label><label class="compat-db-field"><span class="label">Order</span><select id="vq-sort" class="select"><option value="-date">Date newest</option><option value="date">Date oldest</option><option value="quote">Quote low → high</option><option value="-quote">Quote high → low</option><option value="company_name">Company A → Z</option><option value="-company_name">Company Z → A</option></select></label><button class="btn primary" id="search-quotes" type="button">Apply</button><button class="btn secondary" id="clear-quotes-filters" type="button">Clear</button>';
      if(st.q)rows=rows.filter(r=>[r.quote,r.company_name,r.address,r.product].some(v=>norm(v).includes(norm(st.q))));if(st.from||st.to)rows=rows.filter(r=>{const d=dateISO(r.date);return(!st.from||d>=st.from)&&(!st.to||d<=st.to)});if(st.type)rows=rows.filter(r=>norm(r.type)===norm(st.type));dbSortRows(rows,st.sort);
      const pages=Math.max(1,Math.ceil(rows.length/st.size));if(st.page>=pages)st.page=pages-1;const from=st.page*st.size,view=rows.slice(from,from+st.size);
      host.innerHTML='<table class="data-table"><thead><tr><th>DATE</th><th>QUOTE #</th><th>COMPANY OR NAME</th><th>ADDRESS</th><th>TYPE</th><th>PRODUCT</th><th>ACTIONS</th></tr></thead><tbody>'+view.map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+esc(r.quote)+'</td><td>'+esc(r.company_name)+'</td><td>'+esc(r.address)+'</td><td>'+esc(r.type)+'</td><td>'+esc(r.product)+'</td><td class="compat-quote-actions"><button class="btn success btn-sm" data-qsp="'+esc(r.quote_instance_id)+'">SP</button><button class="btn warning btn-sm" data-qco="'+esc(r.quote_instance_id)+'">COST</button><button class="btn primary btn-sm" data-qdet="'+esc(r.quote_instance_id)+'">Details</button><button class="btn secondary btn-sm" data-qedit="'+esc(r.quote_instance_id)+'">Edit</button><button class="btn danger btn-sm" data-qdel="'+esc(r.quote_instance_id)+'">Delete</button></td></tr>').join('')+'</tbody></table>'+dbPagerHtml(st.page,pages,rows.length,st.size);
      const searchQuotes=t.querySelector('#search-quotes'),clearQuotes=t.querySelector('#clear-quotes-filters'),vqEl=t.querySelector('#vq'),vfEl=t.querySelector('#vf'),vtEl=t.querySelector('#vt'),vqtEl=t.querySelector('#vq-type'),vqsEl=t.querySelector('#vq-sort');
      if(!searchQuotes||!clearQuotes||!vqEl||!vfEl||!vtEl||!vqtEl||!vqsEl)throw new Error('No se pudieron inicializar los filtros de DataBase Quotes');
      vqsEl.value=st.sort;
      searchQuotes.onclick=()=>{st.q=vqEl.value.trim();st.from=vfEl.value;st.to=vtEl.value;st.type=vqtEl.value;st.sort=vqsEl.value;st.page=0;compatLoadQuotes()};
      clearQuotes.onclick=()=>{st.q='';st.from='';st.to='';st.type='';st.sort='-date';st.page=0;compatLoadQuotes()};
      host.querySelectorAll('[data-qsp]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qsp,'SP'));host.querySelectorAll('[data-qco]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qco,'COST'));host.querySelectorAll('[data-qdet]').forEach(b=>b.onclick=()=>compatOpenDetails(b.dataset.qdet));host.querySelectorAll('[data-qedit]').forEach(b=>b.onclick=()=>legacy.editQuote?.(b.dataset.qedit));host.querySelectorAll('[data-qdel]').forEach(b=>b.onclick=()=>compatDeleteQuote(b.dataset.qdel));
      host.querySelectorAll('[data-pager="first"]').forEach(b=>b.onclick=()=>{st.page=0;compatLoadQuotes()});host.querySelectorAll('[data-pager="prev"]').forEach(b=>b.onclick=()=>{st.page=Math.max(0,st.page-1);compatLoadQuotes()});host.querySelectorAll('[data-pager="next"]').forEach(b=>b.onclick=()=>{st.page=Math.min(pages-1,st.page+1);compatLoadQuotes()});host.querySelectorAll('[data-pager="last"]').forEach(b=>b.onclick=()=>{st.page=pages-1;compatLoadQuotes()});host.querySelectorAll('.compat-page-size').forEach(b=>b.onchange=e=>{st.size=Number(e.target.value);st.page=0;compatLoadQuotes()})
    }catch(e){console.error(e);toast('No se pudieron cargar las cotizaciones: '+e.message,false)}
  }
  window.loadQuotes=compatLoadQuotes;
  window.bindQuotes=function(){compatLoadQuotes()};

  /* Report engine modeled on the desktop Export Reports dialog. */
  const REPORTS=[
    ['Products','products'],['Customers','customers'],['Verified products','verified'],['Database - Price Quotes','quotes'],['LOCAL DELIVERY REPORT','local_quotes'],['Customers Local Delivery','ld_customers'],['DAILY QUOTATION REPORT','winning_daily'],['QUOTATION REPORT - DATE RANGE','winning_range'],['ALL QUOTES - PRICE DETAILS','details_price'],['ALL QUOTES - COST DETAILS','details_cost'],['ALL QUOTES - FULL DETAILS','details_full']
  ];
  const baseKeyMap={
    date:'DATE',email:'EMAIL',quote:'QUOTE',address:'ZIP CODE/ ADDRESS',company_name:'COMPANY OR NAME',type:'TYPE',sku:'SKU',product:'PRODUCT',qty:'QTY',price_per_case:'PRICE PER CASE',revenue:'REVENUE',insured_value:'INSURED VALUE',better_cost:'BETTER COST',better_shipping_price:'BETTER SHIPING PRICE',better_platform:'BETTER PLATFORM',applied_configuration:'APPLIED CONFIGURATION/Detail products',cost_wwe:'COST WWE',sp_wwe:'SP WWE',transport_wwe:'TRANSPORT WWE',cost_ups:'COST UPS',sp_ups:'SP UPS',transport_ups:'TRANSPORT UPS',cost_cbcfs:'COST CBCFS',sp_cbcfs:'SP CBCFS',transport_cbcfs:'TRANSPORT CBCFS',cost_uber_freight_tl:'COST UBER FREIGHT TL',sp_uber_freight_tl:'SP UBER FREIGHT TL',cost_uber_freight_ltl:'COST UBER FREIGHT LTL',sp_uber_freight_ltl:'SP UBER FREIGHT LTL',transport_uber_freight_ltl:'TRANSPORT UBER FREIGHT LTL',cost_fedex:'COST FEDEX',sp_fedex:'SP FEDEX',cost_local_delivery:'COST LOCAL DELIVERY',sp_local_delivery:'SP LOCAL DELIVERY',services:'SERVICES',nota:'NOTA',pallets_required:'PALLETS REQUIRED',cost_of_pallet_1:'COST OF PALLET 1',cost_of_extra_pallets:'COST OF EXTRA PALLETS'
  };
  const productKeyMap={sku:'SKU',product_list:'Lista de Productos',category:'Categoría',product_type:'Tipo',paper_oz:'Paper OZ',color:'Color',product:'Producto',package_units:'Paquete de Caja/Unidades',weight:'Peso',height:'Altura',ti:'TI',hi:'HI',tihi:'TiHi',dimensions:'Dimensiones',length_in:'Length in',width_in:'Width in',height_in:'Height in',information:'Información',note:'Nota'};
  const customerKeyMap={id_cliente:'ID Cliente',id_code:'ID',type:'Type',company_name:'Company or Name',address:'ZIP CODE/ADDRESS',accessories:'Accesories',local_delivery_cost_1:'Costo LD 1er Pallet',local_delivery_cost_extra:'Costo LD Extra'};
  const verifiedKeyMap={date:'FECHA',time:'HORA',product_list:'LISTA DE PRODUCTOS',quantity:'CANTIDAD',verified_config:'CONFIGURACIÓN VERIFICADA',information_source:'MEDIO INFORMATIVO',category:'CATEGORÍA',product_type:'TIPO',package_units:'PAQUETE DE CAJA/UNTLS',dimensions:'DIMENSIONES',notes:'NOTAS',status:'ESTADO'};
  const ruleKeyMap={id_regla:'ID Regla',estado:'Estado',fecha:'Fecha',categoria:'Categoría',criterio_busqueda:'Criterio de Búsqueda',descripcion:'Descripción',sede_ubicacion:'Sede / Ubicación',modo_envio:'Modo de Envío',carriers_permitidos:'Carriers Permitidos',umbral_ups:'Umbral UPS (Máx. Cajas)',revenue:'Revenue',requiere_validacion:'Requiere Validación',nota:'NOTA'};

  function transportLegacy(r){return bestTransport(r,r.better_platform)}
  function quoteLegacy(r){const out={};for(const [k,v] of Object.entries(baseKeyMap))if(Object.prototype.hasOwnProperty.call(r,k))out[v]=r[k];out.TRANSPORT=transportLegacy(r);return out}
  function productLegacy(r){const o={};for(const [k,v] of Object.entries(productKeyMap))o[v]=r[k]??'';return o}
  function customerLegacy(r){const o={};for(const [k,v] of Object.entries(customerKeyMap))o[v]=r[k]??'';return o}
  function verifiedLegacy(r){const o={};for(const [k,v] of Object.entries(verifiedKeyMap))o[v]=r[k]??'';return o}
  function ruleLegacy(r){const o={};for(const [k,v] of Object.entries(ruleKeyMap))o[v]=r[k]??'';return o}
  function ldLegacy(r){return {'ID':r.id??'','ID Cliente':r.id_cliente??'','ID CLIENTE CODE':r.id_cliente_code??'','Type':r.type??'','Company or Name':r.company_name??'','ZIP CODE/ADDRESS':r.address??'','DATE':r.date??'','Costo LD 1er Pallet':r.cost_1??'','Costo LD Extra':r.cost_extra??''}}

  async function getReportData(kind,filters){
    const df=filters.from,dt=filters.to,q=filters.quote;
    if(kind==='products')return (await allRows('products')).map(productLegacy);
    if(kind==='customers')return (await allRows('customers')).map(customerLegacy);
    if(kind==='verified')return (await allRows('verified_configs')).filter(r=>dateFilter(r,df,dt)).map(verifiedLegacy);
    if(kind==='quotes')return (await allRows('quotes')).filter(r=>dateFilter(r,df,dt)&&(!q||String(r.quote).trim()===q)).map(quoteLegacy);
    if(kind==='local_quotes')return (await allRows('local_quotes')).filter(r=>dateFilter(r,df,dt)&&(!q||String(r.quote).trim()===q)).map(quoteLegacy);
    if(kind==='ld_customers')return (await allRows('local_delivery_cost_history')).filter(r=>dateFilter(r,df,dt)).map(ldLegacy);
    if(kind==='winning_daily'||kind==='winning_range'){
      const rows=(await allRows('quotes')).filter(r=>dateFilter(r,df,dt)&&(!q||String(r.quote).trim()===q));
      const seen=new Set(),out=[];for(const r of rows){const key=[r.date,r.quote,r.sku,r.product,r.qty].join('|');if(!seen.has(key)){seen.add(key);out.push(quoteLegacy(r))}}
      return out;
    }
    if(kind.startsWith('details_')){
      const rows=[...(await allRows('quotes')),...(await allRows('local_quotes'))].filter(r=>dateFilter(r,df,dt)&&(!q||String(r.quote).trim()===q));
      const mode=kind==='details_price'?'price':kind==='details_cost'?'cost':'full';
      const base=['DATE','QUOTE','COMPANY OR NAME','ZIP CODE/ ADDRESS','TYPE','PRODUCT','QTY','REVENUE','BETTER PLATFORM','CONFIGURATION','TRANSPORT'];
      const costs=['COST WWE','COST UPS','COST CBCFS','COST FEDEX','COST UF LTL','COST UF TL'];
      const prices=['PRICE WWE','PRICE UPS','PRICE CBCFS','PRICE FEDEX','PRICE UF LTL','PRICE UF TL'];
      return rows.map(r=>{const o=quoteLegacy(r);o.CONFIGURATION=o['APPLIED CONFIGURATION/Detail products']||'';delete o['APPLIED CONFIGURATION/Detail products'];const want=mode==='price'?[...base,...prices]:mode==='cost'?[...base,...costs]:[...base,...costs,...prices];const z={};for(const c of want)z[c]=o[c]??'';return z});
    }
    return [];
  }
  function dateFilter(r,from,to){const d=dateISO(r.date);return (!from||d>=from)&&(!to||d<=to)}

  function filterWidget(id,label){
    const wrap=document.createElement('div');wrap.className='compat-filter-wrap';wrap.innerHTML=`<span class="label">${label}</span><button type="button" class="btn btn-outline-secondary compat-filter-btn" disabled>Todos</button><div class="compat-filter-menu hidden"></div>`;return wrap;
  }
  function selectedFilterValues(wrap){return [...wrap.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value)}
  function fillFilter(wrap,values,old=[]){
    const menu=wrap.querySelector('.compat-filter-menu'), btn=wrap.querySelector('.compat-filter-btn');const keep=new Set(old);menu.innerHTML=values.map(v=>`<label><input type="checkbox" value="${esc(v)}" ${keep.has(v)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
    const update=()=>{const vals=selectedFilterValues(wrap);btn.textContent=vals.length?vals.join(', '):'Todos'};menu.querySelectorAll('input').forEach(x=>x.onchange=update);update(); btn.disabled=!values.length; btn.onclick=()=>{if(!btn.disabled)menu.classList.toggle('hidden')};
  }
  function reportFiltersState(){
    return {kind:$('#rep-kind')?.value||'winning_daily',from:$('#rep-all')?.checked?'':$('#rep-from')?.value||'',to:$('#rep-all')?.checked?'':$('#rep-to')?.value||'',quote:$('#rep-quote')?.value?.trim()||'',category:selectedFilterValues($('#rep-cat-wrap')||document.createElement('div')),type:selectedFilterValues($('#rep-type-wrap')||document.createElement('div'))};
  }

  function reportViewHtml(){
    const kinds=REPORTS.map(([n,k])=>`<option value="${k}">${esc(n)}</option>`).join('');
    return `<div class="report-panel compat-report">
      <div class="compat-toolbar">
        <label class="compat-span-4"><span class="label">Select Report</span><select id="rep-kind" class="select">${kinds}</select></label>
        <label class="compat-span-2"><span class="label">From</span><input id="rep-from" class="input" type="date" value="${todayISO()}"></label>
        <label class="compat-span-2"><span class="label">To</span><input id="rep-to" class="input" type="date" value="${todayISO()}"></label>
        <label class="compat-span-2" style="display:flex;align-items:center;gap:8px;padding-bottom:9px"><input id="rep-all" type="checkbox"> <span>All dates</span></label>
        <label class="compat-span-2"><span class="label"># Quote</span><input id="rep-quote" class="input" placeholder="Quote (opcional)"></label>
        <div id="rep-cat-wrap" class="compat-span-3"></div><div id="rep-type-wrap" class="compat-span-3"></div>
        <div class="compat-span-6 compat-action-row"><button type="button" class="btn primary" id="rep-search">Search</button><button type="button" class="btn success" id="rep-xlsx">Download Excel</button><button type="button" class="btn danger" id="rep-pdf">Preview PDF</button></div>
      </div>
      <div id="rep-meta" class="compat-report-meta"></div><div id="rep-table" class="scroll-x compat-report-table"></div>
    </div>`;
  }

  let reportCache=[]; let reportTitle='';
  async function refreshReportFilterOptions(){
    const kind=$('#rep-kind')?.value||'winning_daily';
    const catWrap=$('#rep-cat-wrap'),typeWrap=$('#rep-type-wrap'); if(!catWrap||!typeWrap)return;
    const prevCat=selectedFilterValues(catWrap),prevType=selectedFilterValues(typeWrap);
    catWrap.innerHTML='';typeWrap.innerHTML='';
    const cw=filterWidget('rep-cat','Category'),tw=filterWidget('rep-type','Type'); cw.id='rep-cat-wrap';tw.id='rep-type-wrap';catWrap.replaceWith(cw);typeWrap.replaceWith(tw);
    let cats=[],types=[];
    if(kind==='products'){const rows=await allRows('products');cats=[...new Set(rows.map(r=>String(r.category||'').trim()).filter(Boolean))].sort();types=[...new Set(rows.map(r=>String(r.product_type||'').trim()).filter(Boolean))].sort()}
    else if(['customers','verified','ld_customers','winning_daily','winning_range'].includes(kind)){
      if(kind==='customers'){const rows=await allRows('customers');types=[...new Set(rows.map(r=>String(r.type||'').trim()).filter(Boolean))].sort()}
      if(kind==='verified'){const rows=await allRows('verified_configs');cats=[...new Set(rows.map(r=>String(r.category||'').trim()).filter(Boolean))].sort();types=[...new Set(rows.map(r=>String(r.product_type||'').trim()).filter(Boolean))].sort()}
      if(kind==='ld_customers')types=['Local Delivery'];
      if(kind.startsWith('winning')){const rows=await allRows('quotes');types=[...new Set(rows.map(r=>String(r.type||'').trim()).filter(Boolean))].sort()}
    }
    fillFilter(cw,cats,prevCat.filter(x=>cats.includes(x)));fillFilter(tw,types,prevType.filter(x=>types.includes(x)));cw.style.display=cats.length?'':'none';tw.style.display=types.length?'':'none';
    return {catWrap:cw,typeWrap:tw};
  }

  function applyReportPostFilters(rows){
    const cat=selectedFilterValues($('#rep-cat-wrap')),typ=selectedFilterValues($('#rep-type-wrap'));
    const kind=$('#rep-kind')?.value||'';
    if(cat.length){
      if(kind==='products')rows=rows.filter(r=>cat.includes(String(r['Categoría']??'')));
      else if(kind==='verified')rows=rows.filter(r=>cat.includes(String(r['CATEGORÍA']??'')));
    }
    if(typ.length){
      rows=rows.filter(r=>typ.includes(String(r.TYPE??r.Type??r.TIPO??'').trim()));
    }
    return rows;
  }

  function renderReportRows(rows){
    const host=$('#rep-table'),meta=$('#rep-meta'); if(!host)return;
    reportCache=applyReportPostFilters(rows);
    meta.innerHTML=`<span class="compat-badge">${reportCache.length} registro(s)</span><span class="compat-badge">${esc(reportTitle)}</span>`;
    if(!reportCache.length){host.innerHTML='<div class="muted">No hay datos para el reporte solicitado.</div>';return}
    const cols=Object.keys(reportCache[0]);
    host.innerHTML=`<table class="data-table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${reportCache.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  async function runReport(){
    try{
      if(!sbx){toast('Supabase no está disponible',false);return}
      const f=reportFiltersState();
      if(f.from&&f.to&&f.from>f.to){toast('La fecha From no puede ser posterior a To',false);return}
      const titles=Object.fromEntries(REPORTS);
      reportTitle=titles[f.kind]||f.kind;
      const rows=await getReportData(f.kind,f);
      renderReportRows(rows);
    }catch(e){console.error(e);toast('No se pudo generar el reporte: '+e.message,false)}
  }

  function downloadFile(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
  function downloadXlsx(name,rows,cols){
    if(!window.XLSX){toast('Excel no está disponible. Usa Preview PDF.',false);return}
    const data=rows.map(r=>{const o={};for(const c of cols)o[c]=r[c]??'';return o});
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,'LogiSuite');ws['!cols']=cols.map(c=>({wch:Math.min(48,Math.max(10,c.length+4))}));
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});downloadFile(name+'.xlsx',new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel descargado');
  }
  function printReport(title,subtitle,rows){
    if(!rows?.length){toast('No hay datos para imprimir',false);return}
    const w=window.open('','_blank'); if(!w){toast('Ventana de impresión bloqueada',false);return}
    const cols=Object.keys(rows[0]); const html=`<html><head><title>${esc(title)}</title><style>@page{size:landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:9px;padding:10px}h1{font-size:18px;margin:0 0 4px;color:#1a73e8}h3{font-size:10px;margin:0 0 12px;color:#555}table{border-collapse:collapse;width:100%}th,td{border:1px solid #b8c1ca;padding:4px;vertical-align:top;word-break:break-word}th{background:#d9eaf7;color:#1f4e78}tr:nth-child(even){background:#f7f9fb}</style></head><body><h1>${esc(title)}</h1><h3>${esc(subtitle||'')}</h3><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),120);
  }

  window.reportsView=reportViewHtml;
  window.bindReports=async function(){
    ensureCompatCss();
    const root=document.querySelector('.compat-report');
    const k=root?.querySelector('#rep-kind');
    const fromEl=root?.querySelector('#rep-from');
    const toEl=root?.querySelector('#rep-to');
    const allEl=root?.querySelector('#rep-all');
    const searchEl=root?.querySelector('#rep-search');
    const xlsxEl=root?.querySelector('#rep-xlsx');
    const pdfEl=root?.querySelector('#rep-pdf');
    if(!root||!k||!fromEl||!toEl||!allEl||!searchEl||!xlsxEl||!pdfEl)throw new Error('No se pudo inicializar el panel de Reportes');
    await refreshReportFilterOptions();
    k.value='winning_daily'; fromEl.value=todayISO(); toEl.value=todayISO();
    await refreshReportFilterOptions();
    k.onchange=async()=>{await refreshReportFilterOptions()};
    allEl.onchange=()=>{const disabled=allEl.checked;fromEl.disabled=disabled;toEl.disabled=disabled};
    searchEl.onclick=runReport;
    xlsxEl.onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const cols=Object.keys(reportCache[0]);downloadXlsx('LogiSuite_'+(reportTitle||'Report'),reportCache,cols)};
    pdfEl.onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const f=reportFiltersState();printReport(reportTitle,String(f.from||'ALL')+' → '+String(f.to||'ALL'),reportCache)};
    await runReport();
  };

  function openReportsCompat(title){window.openBootstrapModal('compatReportsModal',title||'Reportes',reportViewHtml(),()=>window.bindReports());}
  window.openReportsModal=()=>openReportsCompat('Reportes');
  window.openExportModal=()=>openReportsCompat('Export Reports');

  /* Local Delivery history CRUD. */

  /* Practical DB tables: filters, ordering and pagination. */
  const dbPager={};
  const CRUD_CONFIG={
    products:{table:'products',search:['sku','product_list','category','product_type','product'],filters:[['category','Category'],['product_type','Type']],sorts:[['product_list','Product A → Z'],['-product_list','Product Z → A'],['sku','SKU A → Z'],['-sku','SKU Z → A']]},
    customers:{table:'customers',search:['id_code','type','company_name','address'],filters:[['type','Type']],sorts:[['company_name','Name A → Z'],['-company_name','Name Z → A'],['address','Address A → Z'],['-id_cliente','ID newest']]},
    verified_configs:{table:'verified_configs',search:['product_list','verified_config','category','product_type','information_source','quantity'],filters:[['category','Category'],['product_type','Type'],['status','Status']],sorts:[['-date','Date newest'],['date','Date oldest'],['product_list','Product A → Z'],['-id','ID newest']]},
    rules:{table:'rules',search:['categoria','descripcion','sede_ubicacion','modo_envio','carriers_permitidos','estado'],filters:[['categoria','Category'],['estado','Status'],['modo_envio','Shipping mode']],sorts:[['id_regla','ID low → high'],['-id_regla','ID high → low'],['-fecha','Date newest'],['fecha','Date oldest']]}
  };
  function dbEnsureCss(){
    if(document.getElementById('logi-db-css'))return;
    const s=document.createElement('style');s.id='logi-db-css';
    s.textContent='.compat-db-toolbar{display:grid;grid-template-columns:minmax(220px,2fr) repeat(4,minmax(120px,1fr));gap:8px;align-items:end;margin:8px 0 12px}.compat-db-field{min-width:0}.compat-db-field .label{display:block;margin-bottom:4px;font-size:11px;font-weight:800}.compat-pager{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}.compat-pager-info{font-size:12px;opacity:.78}.compat-quote-actions{display:grid;grid-template-columns:repeat(5,minmax(70px,1fr));gap:5px;align-items:center;min-width:390px}.compat-quote-actions .btn{width:100%;margin:0}@media(max-width:900px){.compat-db-toolbar{grid-template-columns:1fr 1fr}.compat-db-toolbar .compat-db-search{grid-column:1/-1}.compat-quote-actions{min-width:0;grid-template-columns:repeat(2,minmax(72px,1fr))}}';
    document.head.appendChild(s)
  }
  function dbPagerHtml(page,pages,total,size){
    const dis=x=>x?' disabled':'';
    return '<div class="compat-pager"><span class="compat-pager-info">'+total.toLocaleString()+' registro(s) · página '+(pages?Math.min(page+1,pages):0)+'/'+(pages||0)+'</span><div class="compat-action-row"><button type="button" class="btn secondary btn-sm" data-pager="first"'+dis(page<=0)+'>«</button><button type="button" class="btn secondary btn-sm" data-pager="prev"'+dis(page<=0)+'>‹</button><select class="select compat-page-size"><option value="25"'+(size===25?' selected':'')+'>25 / página</option><option value="50"'+(size===50?' selected':'')+'>50 / página</option><option value="100"'+(size===100?' selected':'')+'>100 / página</option></select><button type="button" class="btn secondary btn-sm" data-pager="next"'+dis(page>=pages-1)+'>›</button><button type="button" class="btn secondary btn-sm" data-pager="last"'+dis(page>=pages-1)+'>»</button></div></div>'
  }
  function dbSortRows(rows,spec){
    const desc=spec.charAt(0)==='-',key=desc?spec.slice(1):spec;
    return rows.sort((a,b)=>{
      let av=a?.[key]??'',bv=b?.[key]??'';
      if(key==='date'||key==='fecha'){av=dateISO(av);bv=dateISO(bv)}
      else if(['id','id_cliente','id_regla','qty','quantity'].includes(key)){av=num(av);bv=num(bv)}
      else{av=String(av).toLocaleUpperCase('es');bv=String(bv).toLocaleUpperCase('es')}
      const z=(typeof av==='number'&&typeof bv==='number')?av-bv:String(av).localeCompare(String(bv),'es');
      return desc?-z:z
    })
  }
  function dbMakeToolbar(host,id,html){
    let t=document.getElementById(id);
    if(!t){t=document.createElement('div');t.id=id;t.className='compat-db-toolbar';host.parentElement.insertBefore(t,host)}
    t.innerHTML=html;return t
  }
  async function compatLoadCrud(kind,reset){
    if(!sbx)return;const host=$('#crud-table');if(!host)return;
    const cfg=CRUD_CONFIG[kind];if(!cfg)return legacy.bindCrud?.(kind);
    dbEnsureCss();dbPager[kind]=dbPager[kind]||{page:0,size:25,q:'',filters:{},sort:cfg.sorts[0][0]};
    const st=dbPager[kind];if(reset!==false)st.page=0;
    try{
      const rows=await allRows(cfg.table);
      const filterHtml=cfg.filters.map(f=>'<label class="compat-db-field"><span class="label">'+esc(f[1])+'</span><select class="select" data-db-filter="'+esc(f[0])+'"><option value="">All</option>'+[...new Set(rows.map(r=>String(r?.[f[0]]??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>'<option value="'+esc(v)+'"'+(st.filters[f[0]]===v?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>').join('');
      const sortHtml=cfg.sorts.map(x=>'<option value="'+esc(x[0])+'"'+(st.sort===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('');
      const toolbar=dbMakeToolbar(host,'compat-crud-toolbar','<label class="compat-db-field compat-db-search"><span class="label">Search</span><input id="compat-crud-search" class="input" placeholder="Name, code, address..." value="'+esc(st.q)+'"></label>'+filterHtml+'<label class="compat-db-field"><span class="label">Order</span><select id="compat-crud-sort" class="select">'+sortHtml+'</select></label><button type="button" class="btn primary" id="compat-crud-apply">Apply</button><button type="button" class="btn secondary" id="compat-crud-clear">Clear</button>');
      const q=norm(st.q);let filtered=rows.filter(r=>!q||cfg.search.some(k=>norm(r?.[k]).includes(q)));
      Object.entries(st.filters).forEach(([k,v])=>{if(v)filtered=filtered.filter(r=>norm(r?.[k])===norm(v))});
      dbSortRows(filtered,st.sort);
      const pages=Math.max(1,Math.ceil(filtered.length/st.size));if(st.page>=pages)st.page=pages-1;
      const from=st.page*st.size,view=filtered.slice(from,from+st.size),cell=v=>esc(v??'');
      let body='';
      if(kind==='products')body='<table class="data-table"><thead><tr><th>ID</th><th>SKU</th><th>PRODUCT LIST</th><th>CATEGORY</th><th>TYPE</th><th>PACKAGE</th><th>WEIGHT</th><th>HEIGHT</th><th>TI</th><th>HI</th><th>TiHi</th><th>ACTIONS</th></tr></thead><tbody>'+view.map((r,i)=>'<tr><td>'+cell(r.id)+'</td><td>'+cell(r.sku)+'</td><td>'+cell(r.product_list)+'</td><td>'+cell(r.category)+'</td><td>'+cell(r.product_type)+'</td><td>'+cell(r.package_units)+'</td><td>'+cell(r.weight)+'</td><td>'+cell(r.height)+'</td><td>'+cell(r.ti)+'</td><td>'+cell(r.hi)+'</td><td>'+cell(r.tihi)+'</td><td class="compat-action-row"><button class="btn primary btn-sm" data-db-view="'+(from+i)+'">View</button><button class="btn success btn-sm" data-db-edit="'+(from+i)+'">Edit</button><button class="btn danger btn-sm" data-db-del="'+(from+i)+'">Delete</button></td></tr>').join('')+'</tbody></table>';
      if(kind==='customers')body='<table class="data-table"><thead><tr><th>ID</th><th>CODE</th><th>TYPE</th><th>COMPANY / NAME</th><th>ADDRESS</th><th>LD 1st</th><th>LD EXTRA</th><th>ACTIONS</th></tr></thead><tbody>'+view.map((r,i)=>'<tr><td>'+cell(r.id_cliente)+'</td><td>'+cell(r.id_code)+'</td><td>'+cell(r.type)+'</td><td>'+cell(r.company_name)+'</td><td>'+cell(r.address)+'</td><td>'+cell(r.local_delivery_cost_1)+'</td><td>'+cell(r.local_delivery_cost_extra)+'</td><td class="compat-action-row"><button class="btn success btn-sm" data-db-edit="'+(from+i)+'">Edit</button><button class="btn danger btn-sm" data-db-del="'+(from+i)+'">Delete</button></td></tr>').join('')+'</tbody></table>';
      if(kind==='verified_configs')body='<table class="data-table"><thead><tr><th>ID</th><th>DATE</th><th>TIME</th><th>PRODUCT</th><th>QTY</th><th>CONFIGURATION</th><th>SOURCE</th><th>CATEGORY</th><th>TYPE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>'+view.map(r=>'<tr><td>'+cell(r.id)+'</td><td>'+cell(r.date)+'</td><td>'+cell(r.time)+'</td><td>'+cell(r.product_list)+'</td><td>'+cell(r.quantity)+'</td><td>'+cell(r.verified_config)+'</td><td>'+cell(r.information_source)+'</td><td>'+cell(r.category)+'</td><td>'+cell(r.product_type)+'</td><td>'+cell(r.status||'VIGENTE')+'</td><td class="compat-action-row"><button class="btn primary btn-sm" data-v-edit="'+r.id+'">Edit</button><button class="btn danger btn-sm" data-v-del="'+r.id+'">Delete</button></td></tr>').join('')+'</tbody></table>';
      if(kind==='rules')body='<table class="data-table"><thead><tr><th>ID</th><th>STATUS</th><th>DATE</th><th>CATEGORY</th><th>CRITERION</th><th>DESCRIPTION</th><th>LOCATION</th><th>MODE</th><th>CARRIERS</th><th>UPS</th><th>REVENUE</th><th>VALIDATION</th><th>NOTE</th><th>ACTIONS</th></tr></thead><tbody>'+view.map(r=>'<tr><td>'+cell(r.id_regla)+'</td><td>'+cell(r.estado)+'</td><td>'+cell(r.fecha)+'</td><td>'+cell(r.categoria)+'</td><td>'+cell(r.criterio_busqueda)+'</td><td>'+cell(r.descripcion)+'</td><td>'+cell(r.sede_ubicacion)+'</td><td>'+cell(r.modo_envio)+'</td><td>'+cell(r.carriers_permitidos)+'</td><td>'+cell(r.umbral_ups)+'</td><td>'+cell(r.revenue)+'</td><td>'+cell(r.requiere_validacion)+'</td><td>'+cell(r.nota)+'</td><td class="compat-action-row"><button class="btn primary btn-sm" data-r-edit="'+r.id_regla+'">Edit</button><button class="btn warning btn-sm" data-r-toggle="'+r.id_regla+'">'+(norm(r.estado)==='ACTIVA'?'Deactivate':'Activate')+'</button><button class="btn danger btn-sm" data-r-del="'+r.id_regla+'">Delete</button></td></tr>').join('')+'</tbody></table>';
      host.innerHTML=body+dbPagerHtml(st.page,pages,filtered.length,st.size);
      const searchEl=toolbar.querySelector('#compat-crud-search'),applyEl=toolbar.querySelector('#compat-crud-apply'),clearEl=toolbar.querySelector('#compat-crud-clear'),sortEl=toolbar.querySelector('#compat-crud-sort');
      if(!searchEl||!applyEl||!clearEl||!sortEl)throw new Error('No se pudieron inicializar los filtros de la tabla');
      searchEl.oninput=e=>{st.q=e.target.value;st.page=0};
      applyEl.onclick=()=>{st.q=searchEl.value.trim();st.filters={};toolbar.querySelectorAll('[data-db-filter]').forEach(x=>{if(x.value)st.filters[x.dataset.dbFilter]=x.value});st.sort=sortEl.value;compatLoadCrud(kind)};
      clearEl.onclick=()=>{st.q='';st.filters={};st.sort=cfg.sorts[0][0];compatLoadCrud(kind)};
      host.querySelectorAll('[data-pager="first"]').forEach(b=>b.onclick=()=>{st.page=0;compatLoadCrud(kind,false)});
      host.querySelectorAll('[data-pager="prev"]').forEach(b=>b.onclick=()=>{st.page=Math.max(0,st.page-1);compatLoadCrud(kind,false)});
      host.querySelectorAll('[data-pager="next"]').forEach(b=>b.onclick=()=>{st.page=Math.min(pages-1,st.page+1);compatLoadCrud(kind,false)});
      host.querySelectorAll('[data-pager="last"]').forEach(b=>b.onclick=()=>{st.page=pages-1;compatLoadCrud(kind,false)});
      host.querySelectorAll('.compat-page-size').forEach(b=>b.onchange=e=>{st.size=Number(e.target.value);st.page=0;compatLoadCrud(kind,false)});
      const find=i=>filtered[i];
      host.querySelectorAll('[data-db-view]').forEach(b=>b.onclick=()=>{const r=find(+b.dataset.dbView);if(r)showProductFicha(r)});
      host.querySelectorAll('[data-db-edit]').forEach(b=>b.onclick=()=>{const r=find(+b.dataset.dbEdit);if(r)window.editCrud(kind,r)});
      host.querySelectorAll('[data-db-del]').forEach(b=>b.onclick=async()=>{const r=find(+b.dataset.dbDel);if(!r||!confirm('¿Eliminar registro?'))return;const pk=kind==='products'?'id':'id_cliente';const res=await sbx.from(cfg.table).delete().eq(pk,r[pk]);if(res.error){toast(res.error.message,false);return}await loadReferenceData();compatLoadCrud(kind,false)});
      host.querySelectorAll('[data-v-edit]').forEach(b=>b.onclick=()=>{const r=filtered.find(x=>String(x.id)===b.dataset.vEdit);if(r)compatEditVerified(r)});
      host.querySelectorAll('[data-v-del]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar verificado?'))return;const res=await sbx.from('verified_configs').delete().eq('id',b.dataset.vDel);if(res.error){toast(res.error.message,false);return}compatLoadCrud('verified_configs',false)});
      host.querySelectorAll('[data-r-edit]').forEach(b=>b.onclick=()=>{const r=filtered.find(x=>String(x.id_regla)===b.dataset.rEdit);if(r)compatEditRule(r)});
      host.querySelectorAll('[data-r-toggle]').forEach(b=>b.onclick=async()=>{const r=filtered.find(x=>String(x.id_regla)===b.dataset.rToggle);if(!r)return;let note=r.nota||'';if(norm(r.estado)==='ACTIVA'){note=prompt('Motivo:',note||'')??note;if(!note.trim())return}const res=await sbx.from('rules').update({estado:norm(r.estado)==='ACTIVA'?'INACTIVA':'ACTIVA',nota:note}).eq('id_regla',r.id_regla);if(res.error){toast(res.error.message,false);return}toast('Regla actualizada');compatLoadCrud('rules',false)});
      host.querySelectorAll('[data-r-del]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar regla?'))return;const res=await sbx.from('rules').delete().eq('id_regla',b.dataset.rDel);if(res.error){toast(res.error.message,false);return}compatLoadCrud('rules',false)});
    }catch(e){console.error(e);toast('No se pudo cargar la tabla: '+e.message,false)}
  }
  window.bindCrud=async function(kind){
    dbEnsureCss();const nb=$('#crud-new');if(nb){nb.onclick=()=>kind==='verified_configs'?compatEditVerified(null):kind==='rules'?compatEditRule(null):legacy.editCrud?.(kind,null)}await compatLoadCrud(kind,true)
  };
  window.loadCrud=compatLoadCrud;

  /* Local Delivery with filters and pagination. */
  async function compatBindLocal(){
    const host=$('#ldtable');if(!host||!sbx)return;dbEnsureCss();
    dbPager.local=dbPager.local||{page:0,size:25,q:'',from:'',to:'',sort:'-date'};const st=dbPager.local;
    const row=$('#ldq')?.parentElement;
    if(row&&!row.dataset.compatBuilt){row.dataset.compatBuilt='1';row.className='compat-db-toolbar';row.innerHTML='<label class="compat-db-field compat-db-search"><span class="label">Search</span><input id="ldq" class="input" placeholder="Company, address or code"></label><label class="compat-db-field"><span class="label">From</span><input id="ld-from" class="input" type="date"></label><label class="compat-db-field"><span class="label">To</span><input id="ld-to" class="input" type="date"></label><label class="compat-db-field"><span class="label">Order</span><select id="ld-sort" class="select"><option value="-date">Date newest</option><option value="date">Date oldest</option><option value="company_name">Company A → Z</option><option value="-company_name">Company Z → A</option></select></label><button class="btn primary" id="ldsearch" type="button">Apply</button><button class="btn success" id="ld-add-new" type="button">+ Add</button><button class="btn secondary" id="ld-clear" type="button">Clear</button>';$('#ldq').value=st.q;$('#ld-from').value=st.from;$('#ld-to').value=st.to;$('#ld-sort').value=st.sort;$('#ldsearch').onclick=()=>{st.q=$('#ldq').value.trim();st.from=$('#ld-from').value;st.to=$('#ld-to').value;st.sort=$('#ld-sort').value;st.page=0;compatBindLocal()};$('#ld-clear').onclick=()=>{st.q='';st.from='';st.to='';st.sort='-date';st.page=0;compatBindLocal()};$('#ld-add-new').onclick=()=>compatEditLocalDelivery(null)}
    try{
      let rows=await allRows('local_delivery_cost_history');if(st.q){const q=norm(st.q);rows=rows.filter(r=>[r.company_name,r.address,r.id_cliente_code,r.type].some(v=>norm(v).includes(q)))}if(st.from||st.to)rows=rows.filter(r=>{const d=dateISO(r.date);return(!st.from||d>=st.from)&&(!st.to||d<=st.to)});dbSortRows(rows,st.sort);const pages=Math.max(1,Math.ceil(rows.length/st.size));if(st.page>=pages)st.page=pages-1;const from=st.page*st.size,view=rows.slice(from,from+st.size);
      host.innerHTML='<table class="data-table"><thead><tr><th>ID</th><th>ID CLIENTE</th><th>CODE</th><th>TYPE</th><th>COMPANY</th><th>ADDRESS</th><th>DATE</th><th>COST 1</th><th>EXTRA</th><th>ACTIONS</th></tr></thead><tbody>'+view.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(r.id_cliente)+'</td><td>'+esc(r.id_cliente_code)+'</td><td>'+esc(r.type)+'</td><td>'+esc(r.company_name)+'</td><td>'+esc(r.address)+'</td><td>'+esc(r.date)+'</td><td>$'+num(r.cost_1).toFixed(2)+'</td><td>$'+num(r.cost_extra).toFixed(2)+'</td><td class="compat-action-row"><button class="btn primary btn-sm" data-ld-edit="'+r.id+'">Edit</button><button class="btn danger btn-sm" data-ld-del="'+r.id+'">Delete</button></td></tr>').join('')+'</tbody></table>'+dbPagerHtml(st.page,pages,rows.length,st.size);
      host.querySelectorAll('[data-ld-edit]').forEach(b=>b.onclick=()=>compatEditLocalDelivery(Number(b.dataset.ldEdit)));host.querySelectorAll('[data-ld-del]').forEach(b=>b.onclick=()=>compatDeleteLocalDelivery(Number(b.dataset.ldDel)));host.querySelectorAll('[data-pager="first"]').forEach(b=>b.onclick=()=>{st.page=0;compatBindLocal()});host.querySelectorAll('[data-pager="prev"]').forEach(b=>b.onclick=()=>{st.page=Math.max(0,st.page-1);compatBindLocal()});host.querySelectorAll('[data-pager="next"]').forEach(b=>b.onclick=()=>{st.page=Math.min(pages-1,st.page+1);compatBindLocal()});host.querySelectorAll('[data-pager="last"]').forEach(b=>b.onclick=()=>{st.page=pages-1;compatBindLocal()});host.querySelectorAll('.compat-page-size').forEach(b=>b.onchange=e=>{st.size=Number(e.target.value);st.page=0;compatBindLocal()})
    }catch(e){toast('No se pudo cargar Local Delivery: '+e.message,false)}
  }
  window.bindLocal=compatBindLocal;
  /* Specialized Verified / Rules editors. */
  async function compatEditVerified(row=null){
    const products=await allRows('products');
    const options=products.map(p=>`<option value="${esc(p.product_list)}">${esc(p.product_list)}${p.sku?' · '+esc(p.sku):''}</option>`).join('');
    const body=`<div class="compat-form-grid"><label><span class="label">FECHA</span><input id="vc-date" type="date" class="input"></label><label><span class="label">HORA</span><input id="vc-time" class="input"></label><label class="full"><span class="label">LISTA DE PRODUCTOS</span><select id="vc-product" class="select">${options}</select></label><label><span class="label">CANTIDAD</span><input id="vc-qty" class="input" type="number" min="1"></label><label><span class="label">MEDIO INFORMATIVO</span><input id="vc-source" class="input"></label><label><span class="label">CATEGORÍA</span><input id="vc-cat" class="input" readonly></label><label><span class="label">TIPO</span><input id="vc-type" class="input" readonly></label><label><span class="label">PAQUETE</span><input id="vc-pack" class="input" readonly></label><label><span class="label">DIMENSIONES</span><input id="vc-dims" class="input" readonly></label><label><span class="label">ESTADO</span><select id="vc-status" class="select"><option>VIGENTE</option><option>NO VIGENTE</option></select></label><label class="full"><span class="label">NOTAS</span><textarea id="vc-notes" class="textarea"></textarea></label></div><div style="margin-top:14px"><div class="compat-rows-head"><span>Pallets</span><span>Cases/Pallet</span><span>Height</span><span>Weight</span><span></span><span></span></div><div id="vc-rows"></div><div class="compat-action-row" style="margin-top:8px"><button type="button" class="btn secondary" id="vc-add-row">+ Row</button><span class="compat-small compat-muted">La configuración genera el mismo formato de texto usado por el escritorio.</span></div><label style="display:block;margin-top:12px"><span class="label">CONFIGURACIÓN VERIFICADA</span><textarea id="vc-config" class="textarea compat-config-preview" readonly></textarea></label></div><div class="compat-action-row" style="justify-content:flex-end;margin-top:14px"><button class="btn secondary" id="vc-cancel" type="button">Cancel</button><button class="btn success" id="vc-save" type="button">Save</button></div>`;
    window.openBootstrapModal('compatVcModal',row?'Edit Verified Product':'New Verified Product',body,()=>{
      const f=id=>$('#'+id); f('vc-date').value=row?.date?dateISO(row.date):todayISO();f('vc-time').value=row?.time||formatTime12();f('vc-qty').value=row?.quantity||'';f('vc-source').value=row?.information_source||'';f('vc-notes').value=row?.notes||'';f('vc-status').value=row?.status||'VIGENTE';
      if(row?.product_list)f('vc-product').value=row.product_list;
      function fillMeta(){const p=products.find(x=>String(x.product_list)===String(f('vc-product').value));f('vc-cat').value=p?.category||row?.category||'';f('vc-type').value=p?.product_type||row?.product_type||'';f('vc-pack').value=p?.package_units||row?.package_units||'';f('vc-dims').value=p?.dimensions||row?.dimensions||''}
      const parseCfg=s=>{const matches=String(s||'').match(/(\d+(?:\.\d+)?)\s*P\s*,\s*(\d+(?:\.\d+)?)\s*cs\s*\(W:\s*(\d+(?:\.\d+)?)\s*lbs\s*,\s*H:\s*(\d+(?:\.\d+)?)/gi)||[];return matches.map(m=>{const z=m.match(/(\d+(?:\.\d+)?)\s*P\s*,\s*(\d+(?:\.\d+)?)\s*cs\s*\(W:\s*(\d+(?:\.\d+)?)\s*lbs\s*,\s*H:\s*(\d+(?:\.\d+)?)/i);return z?{p:z[1],c:num(z[2])/Math.max(num(z[1]),1),w:num(z[3])/Math.max(num(z[1]),1),h:z[4]}:null}).filter(Boolean)};
      const addRow=(data={})=>{const d=document.createElement('div');d.className='compat-row';d.innerHTML='<input class="input vc-p" type="number" step="0.01" min="0" value="'+esc(data.p||'')+'"><input class="input vc-c" type="number" step="0.01" min="0" value="'+esc(data.c||'')+'"><input class="input vc-h" type="number" step="0.01" min="0" value="'+esc(data.h||'')+'"><input class="input vc-w" type="number" step="0.01" min="0" value="'+esc(data.w||'')+'"><span class="compat-small"> </span><button type="button" class="btn danger btn-sm vc-rm">×</button>';$('#vc-rows').appendChild(d);d.querySelectorAll('input').forEach(i=>i.oninput=buildCfg);d.querySelector('.vc-rm').onclick=()=>{if($('#vc-rows').children.length>1)d.remove();buildCfg()};buildCfg()};
      const fmt=n=>Number.isFinite(n)?String(Number(n.toFixed(6))).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1'):String(n); const buildCfg=()=>{const parts=[...document.querySelectorAll('#vc-rows .compat-row')].map(d=>{const p=num(d.querySelector('.vc-p').value),c=num(d.querySelector('.vc-c').value),h=num(d.querySelector('.vc-h').value),w=num(d.querySelector('.vc-w').value);return p>0?`${fmt(p)} P, ${fmt(p*c)}cs (W: ${fmt(p*w)} lbs, H: ${fmt(h)} " )`:''}).filter(Boolean);f('vc-config').value=parts.join(' + ')};
      const existing=parseCfg(row?.verified_config||''); if(existing.length)existing.forEach(addRow);else addRow();f('vc-add-row').onclick=()=>addRow();f('vc-product').onchange=fillMeta;fillMeta();buildCfg();
      f('vc-cancel').onclick=()=>window.bootstrap.Modal.getInstance($('#compatVcModal'))?.hide();
      f('vc-save').onclick=async()=>{const product=f('vc-product').value,qty=String(f('vc-qty').value||'').trim(),cfg=f('vc-config').value.trim();if(!product||!qty||!cfg){toast('Producto, cantidad y configuración son obligatorios',false);return}const p=products.find(x=>String(x.product_list)===product);const obj={date:dateDMY(f('vc-date').value),time:f('vc-time').value.trim()||formatTime12(),product_list:product,quantity:qty,verified_config:cfg,information_source:f('vc-source').value.trim(),category:p?.category||f('vc-cat').value,product_type:p?.product_type||f('vc-type').value,package_units:p?.package_units||f('vc-pack').value,dimensions:p?.dimensions||f('vc-dims').value,notes:f('vc-notes').value.trim(),status:f('vc-status').value};let res;if(row){res=await sbx.from('verified_configs').update(obj).eq('id',row.id)}else{const ids=await allRows('verified_configs','id');const next=Math.max(0,...ids.map(x=>num(x.id)))+1;obj.id=next;res=await sbx.from('verified_configs').insert(obj)}if(res.error){toast(res.error.message,false);return}toast(row?'Verificado actualizado':'Verificado guardado');window.bootstrap.Modal.getInstance($('#compatVcModal'))?.hide();if(window.loadReferenceData)await window.loadReferenceData();compatLoadCrud('verified_configs')};
    });
  }

  async function compatEditRule(row=null){
    const body=`<div class="compat-form-grid"><label><span class="label">Estado</span><select id="rc-status" class="select"><option>ACTIVA</option><option>INACTIVA</option></select></label><label><span class="label">Fecha</span><input id="rc-date" type="date" class="input"></label><label><span class="label">Categoría</span><select id="rc-cat" class="select"><option>GENERAL</option><option>CLIENTES</option><option>PRODUCTOS</option></select></label><label><span class="label">Criterio de Búsqueda</span><select id="rc-crit" class="select"><option>NOMBRE EXACTO</option><option>CATEGORÍA</option><option>TIPO</option></select></label><label class="full"><span class="label">Descripción</span><input id="rc-desc" class="input"></label><label><span class="label">Sede / Ubicación</span><input id="rc-loc" class="input"></label><label><span class="label">Modo de Envío</span><input id="rc-mode" class="input"></label><label><span class="label">Carriers Permitidos</span><input id="rc-carriers" class="input"></label><label><span class="label">Umbral UPS (Máx. Cajas)</span><input id="rc-ups" class="input"></label><label><span class="label">Revenue</span><input id="rc-rev" class="input"></label><label><span class="label">Requiere Validación</span><select id="rc-valid" class="select"><option>No</option><option>Sí</option></select></label><label class="full"><span class="label">NOTA</span><textarea id="rc-note" class="textarea"></textarea></label></div><div class="compat-action-row" style="justify-content:flex-end;margin-top:14px"><button class="btn secondary" id="rc-cancel" type="button">Cancel</button><button class="btn success" id="rc-save" type="button">Save Rule</button></div>`;
    window.openBootstrapModal('compatRuleModal',row?'Edit Rule':'New Rule',body,()=>{
      const f=id=>$('#'+id);f('rc-status').value=row?.estado||'ACTIVA';f('rc-date').value=row?.fecha?dateISO(row.fecha):todayISO();f('rc-cat').value=row?.categoria||'GENERAL';f('rc-crit').value=row?.criterio_busqueda||'NOMBRE EXACTO';f('rc-desc').value=row?.descripcion||'';f('rc-loc').value=row?.sede_ubicacion||'Todas';f('rc-mode').value=row?.modo_envio||'Todos';f('rc-carriers').value=row?.carriers_permitidos||'Todos';f('rc-ups').value=row?.umbral_ups||'-';f('rc-rev').value=row?.revenue||'-';f('rc-valid').value=norm(row?.requiere_validacion).includes('SI')?'Sí':'No';f('rc-note').value=row?.nota||'';
      f('rc-cancel').onclick=()=>window.bootstrap.Modal.getInstance($('#compatRuleModal'))?.hide();f('rc-save').onclick=async()=>{const desc=f('rc-desc').value.trim();if(!desc){toast('Descripción es obligatoria',false);return}const obj={estado:f('rc-status').value,fecha:dateDMY(f('rc-date').value),categoria:f('rc-cat').value,criterio_busqueda:f('rc-crit').value,descripcion:desc,sede_ubicacion:f('rc-loc').value.trim()||'Todas',modo_envio:f('rc-mode').value.trim()||'Todos',carriers_permitidos:f('rc-carriers').value.trim()||'Todos',umbral_ups:f('rc-ups').value.trim()||'-',revenue:f('rc-rev').value.trim()||'-',requiere_validacion:f('rc-valid').value,nota:f('rc-note').value.trim()};let res;if(row)res=await sbx.from('rules').update(obj).eq('id_regla',row.id_regla);else{const ids=await allRows('rules','id_regla');obj.id_regla=Math.max(0,...ids.map(x=>num(x.id_regla)))+1;res=await sbx.from('rules').insert(obj)}if(res.error){toast(res.error.message,false);return}toast('Regla guardada');window.bootstrap.Modal.getInstance($('#compatRuleModal'))?.hide();if(window.loadReferenceData)await window.loadReferenceData();compatLoadCrud('rules');};
    });
  }

  async function compatLoadCrudLegacyOld(kind){
    if(!sbx)return;const host=$('#crud-table');if(!host)return;const q=norm($('#crud-q')?.value||'');
    if(kind==='rules'){
      let rows=await allRows('rules');if(q)rows=rows.filter(r=>JSON.stringify(r).toUpperCase().includes(q));rows.sort((a,b)=>num(a.id_regla)-num(b.id_regla));
      host.innerHTML=`<table class="data-table"><thead><tr><th>ID</th><th>Estado</th><th>Fecha</th><th>Categoría</th><th>Criterio</th><th>Descripción</th><th>Sede</th><th>Modo</th><th>Carriers</th><th>UPS</th><th>Revenue</th><th>Validación</th><th>NOTA</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.id_regla)}</td><td>${esc(r.estado)}</td><td>${esc(r.fecha)}</td><td>${esc(r.categoria)}</td><td>${esc(r.criterio_busqueda)}</td><td>${esc(r.descripcion)}</td><td>${esc(r.sede_ubicacion)}</td><td>${esc(r.modo_envio)}</td><td>${esc(r.carriers_permitidos)}</td><td>${esc(r.umbral_ups)}</td><td>${esc(r.revenue)}</td><td>${esc(r.requiere_validacion)}</td><td>${esc(r.nota)}</td><td><div class="compat-action-row"><button class="btn primary btn-sm" data-r-edit="${r.id_regla}">Edit</button><button class="btn warning btn-sm" data-r-toggle="${r.id_regla}">${norm(r.estado)==='ACTIVA'?'Deactivate':'Activate'}</button><button class="btn danger btn-sm" data-r-del="${r.id_regla}">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-r-edit]').forEach(b=>b.onclick=()=>compatEditRule(rows.find(r=>String(r.id_regla)===b.dataset.rEdit)||null));
      host.querySelectorAll('[data-r-toggle]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>String(x.id_regla)===b.dataset.rToggle);if(!r)return;let note=r.nota||'';if(norm(r.estado)==='ACTIVA'){note=prompt('Motivo:',note||'')??note;if(!note.trim())return}const {error}=await sbx.from('rules').update({estado:norm(r.estado)==='ACTIVA'?'INACTIVA':'ACTIVA',nota:note}).eq('id_regla',r.id_regla);if(error){toast(error.message,false);return}toast(norm(r.estado)==='ACTIVA'?'Regla desactivada':'Regla activada');compatLoadCrud('rules')});
      host.querySelectorAll('[data-r-del]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar regla?'))return;const {error}=await sbx.from('rules').delete().eq('id_regla',b.dataset.rDel);if(error){toast(error.message,false);return}compatLoadCrud('rules')});
      return;
    }
    if(kind==='verified'){
      let rows=await allRows('verified_configs');if(q)rows=rows.filter(r=>JSON.stringify(r).toUpperCase().includes(q));rows.sort((a,b)=>num(b.id)-num(a.id));
      host.innerHTML=`<table class="data-table"><thead><tr><th>ID</th><th>FECHA</th><th>HORA</th><th>PRODUCTO</th><th>CANT.</th><th>CONFIGURACIÓN</th><th>MEDIO</th><th>CATEGORÍA</th><th>TIPO</th><th>PAQUETE</th><th>DIMENSIONES</th><th>NOTAS</th><th>ESTADO</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td>${esc(r.product_list)}</td><td>${esc(r.quantity)}</td><td>${esc(r.verified_config)}</td><td>${esc(r.information_source)}</td><td>${esc(r.category)}</td><td>${esc(r.product_type)}</td><td>${esc(r.package_units)}</td><td>${esc(r.dimensions)}</td><td>${esc(r.notes)}</td><td>${esc(r.status||'VIGENTE')}</td><td><div class="compat-action-row"><button class="btn primary btn-sm" data-v-edit="${r.id}">Edit</button><button class="btn danger btn-sm" data-v-del="${r.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-v-edit]').forEach(b=>b.onclick=()=>compatEditVerified(rows.find(r=>String(r.id)===b.dataset.vEdit)||null));
      host.querySelectorAll('[data-v-del]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar verificado?'))return;const {error}=await sbx.from('verified_configs').delete().eq('id',b.dataset.vDel);if(error){toast(error.message,false);return}compatLoadCrud('verified_configs')});
      return;
    }
    return legacy.bindCrud?.(kind);
  }
  window.bindCrud=async function(kind){
    if(kind==='verified_configs'||kind==='rules'){const nb=$('#crud-new');if(nb){nb.onclick=()=>kind==='verified_configs'?compatEditVerified(null):compatEditRule(null)}const s=$('#crud-q');if(s)s.oninput=()=>compatLoadCrud(kind);await compatLoadCrud(kind);return}
    legacy.bindCrud?.(kind);
  };
  window.editCrud=function(kind,row){if(kind==='verified_configs')return compatEditVerified(row);if(kind==='rules')return compatEditRule(row);return legacy.editCrud?.(kind,row)};

  function wireCurrent(){
    ensureCompatCss();
    ensureTopBackupButton();
    // Current page may already have been rendered before this compatibility script executed.
    replaceButton('view-quotes',()=>window.openBootstrapModal('compatQuotesModal','View Quotes',`<div class="between"><div class="compat-action-row"><input id="vq" class="input" style="width:220px" placeholder="Quote / company / product"><input id="vf" class="input" type="date"><input id="vt" class="input" type="date"><button class="btn primary" id="search-quotes">Buscar</button></div></div><div id="quotes-table" class="scroll-x" style="margin-top:12px"></div>`,()=>{const d=todayISO();$('#vf').value=d;$('#vt').value=d;$('#search-quotes').onclick=compatLoadQuotes;compatLoadQuotes();}));
    replaceButton('export',()=>window.openExportModal());
    replaceButton('reports',()=>window.openReportsModal());
    // Database uses the existing navigation; its report/local/CRUD tabs call our patched globals dynamically.
  }

  const legacyBindQuote=legacy.bindQuote;
  window.bindQuote=function(){
    legacyBindQuote?.();
    ensureTopBackupButton();
    replaceButton('view-quotes',()=>window.openBootstrapModal('compatQuotesModal','View Quotes',`<div class="between"><div class="compat-action-row"><input id="vq" class="input" style="width:220px" placeholder="Quote / company / product"><input id="vf" class="input" type="date"><input id="vt" class="input" type="date"><button class="btn primary" id="search-quotes">Buscar</button></div></div><div id="quotes-table" class="scroll-x" style="margin-top:12px"></div>`,()=>{const d=todayISO();$('#vf').value=d;$('#vt').value=d;$('#search-quotes').onclick=compatLoadQuotes;compatLoadQuotes();}));
    replaceButton('export',()=>window.openExportModal());
    replaceButton('reports',()=>window.openReportsModal());
    const date=$('#qdate'),company=$('#qcompany'),addr=$('#qaddress'),type=$('#qtype');
    [date,company,addr,type].forEach(el=>el?.addEventListener('change',syncHistoricalLdCost));
    addr?.addEventListener('blur',syncHistoricalLdCost); company?.addEventListener('blur',syncHistoricalLdCost);
    setTimeout(syncHistoricalLdCost,0);
  };

  // Patch existing current DOM and keep future renders patched.
  wireCurrent();
})();
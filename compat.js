/* LogiSuite compatibility layer — v42
 * Brings the web UI/functionality closer to the desktop reference without
 * replacing the existing calculation engine. Loaded after app.js.
 */
(function(){
  'use strict';

  const C=window.LOGISUITE_CONFIG||{};
  const sbx=(window.supabase?.createClient&&C.SUPABASE_URL&&C.SUPABASE_PUBLISHABLE_KEY)
    ? window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
    : null;
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
    if(!sbx)return;
    const x=await findQuote(iid);
    if(!x){toast('Cotización no encontrada',false);return}
    const first=x.rows[0], costMode=String(mode).toUpperCase()==='COST';
    const lines=x.rows.map(r=>{
      const best=costMode?actualMinCost(r).name:String(r.better_platform||'');
      const price=costMode?actualMinCost(r).cost:num(r.better_shipping_price);
      const isLocal=norm(first.type)==='LOCAL DELIVERY'||norm(best)==='LOCAL DELIVERY';
      let transport='';
      if(norm(best)==='WWE')transport=r.transport_wwe||'';
      else if(norm(best)==='CBCFS')transport=r.transport_cbcfs||'';
      else if(norm(best).includes('UBER FREIGHT'))transport=r.transport_uber_freight_ltl||'';
      const platform=isLocal?'':best+(costMode?' (COST)':'')+':';
      return {product:r.product||'',qty:String(r.qty||'')+' cases /',platform,price,config:r.applied_configuration||'',transport:transport?'- '+transport:''};
    });
    const serviceSet=new Set();let showServices=false;
    for(const r of x.rows){
      const best=norm(costMode?actualMinCost(r).name:r.better_platform);
      if(best==='WWE'||best==='CBCFS'||best.includes('UBER FREIGHT LTL'))showServices=true;
      String(r.services||'').split(',').map(v=>v.trim()).filter(v=>v&&v.toLowerCase()!=='none').forEach(v=>serviceSet.add(v.replace(/^.*?:/,'').replace(/^.*?\\]/,'').trim()));
    }
    const services=showServices?[...serviceSet].sort().join(', '):'';
    const copy=['QUOTE #'+first.quote,'Date: '+first.date,'Customer: '+(first.company_name||''),'Address: '+(first.address||''),'Services: '+services,'',...lines.map(z=>z.product+', '+z.qty+(z.platform?' '+z.platform:'')+' 

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
    for(const t of ['quotes','local_quotes']){const {error}=await sbx.from(t).delete().eq('quote_instance_id',iid);if(error){toast(error.message,false);return}}
    toast('Cotización eliminada'); await compatLoadQuotes();
  }
  window.deleteQuote=compatDeleteQuote;

  async function compatLoadQuotes(){
    if(!sbx)return; const host=$('#quotes-table'); if(!host)return;
    try{
      const [q,l]=await Promise.all([allRows('quotes','quote_instance_id,date,quote,company_name,address,type,product'),allRows('local_quotes','quote_instance_id,date,quote,company_name,address,type,product')]);
      let rows=[...q,...l]; const term=norm($('#vq')?.value||''),from=$('#vf')?.value||'',to=$('#vt')?.value||'';
      if(term)rows=rows.filter(r=>[r.quote,r.company_name,r.address,r.product].some(v=>norm(v).includes(term)));
      if(from||to)rows=rows.filter(r=>{const d=dateISO(r.date);return(!from||d>=from)&&(!to||d<=to)});
      const groups=new Map(); for(const r of rows){const k=String(r.quote_instance_id||`LEGACY|${r.quote}|${r.date}|${r.company_name}|${r.address}|${r.type}`);if(!groups.has(k))groups.set(k,r)}
      rows=[...groups.entries()].map(([iid,r])=>({...r,_iid:iid}));
      rows.sort((a,b)=>dateISO(b.date).localeCompare(dateISO(a.date))||String(b.quote||'').localeCompare(String(a.quote||'')));
      host.innerHTML=`<table class="data-table"><thead><tr><th>DATE</th><th>QUOTE #</th><th>COMPANY OR NAME</th><th>ADDRESS</th><th>TYPE</th><th>PRODUCT</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.quote)}</td><td>${esc(r.company_name)}</td><td>${esc(r.address)}</td><td>${esc(r.type)}</td><td>${esc(r.product)}</td><td class="compat-action-row"><button class="btn success btn-sm" data-qsp="${esc(r._iid)}">SP</button><button class="btn warning btn-sm" data-qco="${esc(r._iid)}">COST</button><button class="btn primary btn-sm" data-qdet="${esc(r._iid)}">Details</button><button class="btn secondary btn-sm" data-qedit="${esc(r._iid)}">Edit</button><button class="btn danger btn-sm" data-qdel="${esc(r._iid)}">Delete</button></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-qsp]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qsp,'SP'));
      host.querySelectorAll('[data-qco]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qco,'COST'));
      host.querySelectorAll('[data-qdet]').forEach(b=>b.onclick=()=>compatOpenDetails(b.dataset.qdet));
      host.querySelectorAll('[data-qedit]').forEach(b=>b.onclick=()=>legacy.editQuote?.(b.dataset.qedit));
      host.querySelectorAll('[data-qdel]').forEach(b=>b.onclick=()=>compatDeleteQuote(b.dataset.qdel));
    }catch(e){console.error(e);toast('No se pudieron cargar las cotizaciones: '+e.message,false)}
  }
  window.loadQuotes=compatLoadQuotes;
  window.bindQuotes=function(){
    const b=$('#search-quotes'); if(b)b.onclick=compatLoadQuotes; compatLoadQuotes();
  };

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
    const wrap=document.createElement('div');wrap.className='compat-filter-wrap';wrap.innerHTML=`<span class="label">${label}</span><button type="button" class="btn btn-outline-secondary compat-filter-btn">Optional</button><div class="compat-filter-menu hidden"></div>`;return wrap;
  }
  function selectedFilterValues(wrap){return [...wrap.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value)}
  function fillFilter(wrap,values,old=[]){
    const menu=wrap.querySelector('.compat-filter-menu'), btn=wrap.querySelector('.compat-filter-btn');const keep=new Set(old);menu.innerHTML=values.map(v=>`<label><input type="checkbox" value="${esc(v)}" ${keep.has(v)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
    const update=()=>{const vals=selectedFilterValues(wrap);btn.textContent=vals.length?vals.join(', '):'Optional'};menu.querySelectorAll('input').forEach(x=>x.onchange=update);update(); btn.onclick=()=>menu.classList.toggle('hidden');
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
        <label class="compat-span-2"><span class="label"># Quote</span><input id="rep-quote" class="input" placeholder="Optional"></label>
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
    fillFilter(cw,cats,prevCat.filter(x=>cats.includes(x)));fillFilter(tw,types,prevType.filter(x=>types.includes(x)));
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
    const k=$('#rep-kind'); if(!k)return;
    await refreshReportFilterOptions();
    // Default desktop behavior: the daily report starts on today.
    k.value='winning_daily'; $('#rep-from').value=todayISO();$('#rep-to').value=todayISO();
    await refreshReportFilterOptions();
    const refresh=async()=>{await refreshReportFilterOptions()};
    k.onchange=refresh;
    $('#rep-all').onchange=()=>{const disabled=$('#rep-all').checked;$('#rep-from').disabled=disabled;$('#rep-to').disabled=disabled};
    $('#rep-search').onclick=runReport;
    $('#rep-xlsx').onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const cols=Object.keys(reportCache[0]);downloadXlsx('LogiSuite_'+(reportTitle||'Report'),reportCache,cols)};
    $('#rep-pdf').onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const f=reportFiltersState();printReport(reportTitle,`${f.from||'ALL'} → ${f.to||'ALL'}`,reportCache)};
    await runReport();
  };

  function openReportsCompat(title){window.openBootstrapModal('compatReportsModal',title||'Reportes',reportViewHtml(),()=>window.bindReports());}
  window.openReportsModal=()=>openReportsCompat('Reportes');
  window.openExportModal=()=>openReportsCompat('Export Reports');

  /* Local Delivery history CRUD. */
  async function compatBindLocal(){
    const host=$('#ldtable'); if(!host||!sbx)return;
    const toolbar=$('#ldq')?.parentElement; if(toolbar&&!toolbar.querySelector('[data-ld-add]')){const b=document.createElement('button');b.type='button';b.className='btn success';b.dataset.ldAdd='1';b.textContent='➕ Add Local Delivery Cost';b.onclick=()=>compatEditLocalDelivery(null);toolbar.appendChild(b)}
    try{
      const term=norm($('#ldq')?.value||''); let rows=await allRows('local_delivery_cost_history');
      if(term)rows=rows.filter(r=>[r.company_name,r.address,r.id_cliente_code,r.type].some(v=>norm(v).includes(term)));
      rows.sort((a,b)=>dateISO(b.date).localeCompare(dateISO(a.date))||num(b.id)-num(a.id));
      host.innerHTML=`<table class="data-table"><thead><tr><th>ID</th><th>ID CLIENTE</th><th>CODE</th><th>TYPE</th><th>COMPANY</th><th>ADDRESS</th><th>DATE</th><th>COST 1</th><th>EXTRA</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.id_cliente)}</td><td>${esc(r.id_cliente_code)}</td><td>${esc(r.type)}</td><td>${esc(r.company_name)}</td><td>${esc(r.address)}</td><td>${esc(r.date)}</td><td>$${num(r.cost_1).toFixed(2)}</td><td>$${num(r.cost_extra).toFixed(2)}</td><td><div class="compat-action-row"><button class="btn primary btn-sm" data-ld-edit="${r.id}">Edit</button><button class="btn danger btn-sm" data-ld-del="${r.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-ld-edit]').forEach(b=>b.onclick=()=>compatEditLocalDelivery(Number(b.dataset.ldEdit)));
      host.querySelectorAll('[data-ld-del]').forEach(b=>b.onclick=()=>compatDeleteLocalDelivery(Number(b.dataset.ldDel)));
    }catch(e){toast('No se pudo cargar Local Delivery: '+e.message,false)}
  }
  async function compatDeleteLocalDelivery(id){if(!confirm('¿Eliminar este registro histórico de costo?'))return;const {error}=await sbx.from('local_delivery_cost_history').delete().eq('id',id);if(error){toast(error.message,false);return}toast('Registro histórico eliminado');compatBindLocal()}

  async function compatEditLocalDelivery(id=null){
    let row=null; if(id!=null){const {data,error}=await sbx.from('local_delivery_cost_history').select('*').eq('id',id).maybeSingle();if(error||!data){toast(error?.message||'Registro no encontrado',false);return}row=data}
    const localCustomers=await allRows('customers');
    const opts=['<option value="">— Seleccionar cliente —</option>',...localCustomers.filter(c=>localType(c.type)).map(c=>`<option value="${esc(c.id_cliente)}">${esc(c.company_name)} · ${esc(c.address)}</option>`)].join('');
    const body=`<div class="compat-form-grid"><label class="full"><span class="label">Customer</span><select id="ldc-customer" class="select">${opts}</select></label><label><span class="label">Company or Name</span><input id="ldc-company" class="input"></label><label><span class="label">ZIP CODE</span><input id="ldc-zip" class="input" maxlength="5" inputmode="numeric"></label><label class="full"><span class="label">ZIP CODE/ADDRESS</span><textarea id="ldc-address" class="textarea"></textarea></label><label><span class="label">DATE</span><input id="ldc-date" type="date" class="input"></label><label><span class="label">ID CLIENTE</span><input id="ldc-id" class="input" readonly></label><label><span class="label">ID CLIENTE CODE</span><input id="ldc-code" class="input" readonly></label><label><span class="label">Costo LD 1er Pallet</span><input id="ldc-c1" class="input" type="number" step="0.01"></label><label><span class="label">Costo LD Extra</span><input id="ldc-ce" class="input" type="number" step="0.01"></label></div><div class="compat-action-row" style="justify-content:flex-end;margin-top:14px"><button class="btn secondary" id="ldc-cancel" type="button">Cancel</button><button class="btn success" id="ldc-save" type="button">Save</button></div>`;
    window.openBootstrapModal('compatLdModal',id==null?'Add Local Delivery Cost':'Edit Local Delivery Cost',body,()=>{
      const customer=$('#ldc-customer'),company=$('#ldc-company'),zip=$('#ldc-zip'),addr=$('#ldc-address'),date=$('#ldc-date'),cid=$('#ldc-id'),code=$('#ldc-code'),c1=$('#ldc-c1'),ce=$('#ldc-ce');
      if(row){customer.value=String(row.id_cliente??'');company.value=row.company_name||'';addr.value=row.address||'';zip.value=(String(row.address||'').match(/\b\d{5}\b/)||[''])[0];date.value=dateISO(row.date);cid.value=row.id_cliente??'';code.value=row.id_cliente_code||'';c1.value=row.cost_1??'';ce.value=row.cost_extra??''}
      else{date.value=todayISO();ce.value='20'}
      const refreshCode=()=>{const z=String(zip.value||'').replace(/\D/g,'').slice(0,5);if(!z){code.value='';return}const used=new Set(localCustomers.filter(c=>String(c.id_cliente)!==String(cid.value||'')).map(c=>norm(c.id_code)));const base='LD'+z;let v=base,n=2;while(used.has(norm(v))){v=base+'_'+n;n++}code.value=v};
      customer.onchange=()=>{const c=localCustomers.find(x=>String(x.id_cliente)===String(customer.value));if(c){cid.value=c.id_cliente??'';code.value=c.id_code||'';company.value=c.company_name||'';addr.value=c.address||'';zip.value=(String(c.address||'').match(/\b\d{5}\b/)||[''])[0]}};
      zip.oninput=refreshCode;addr.oninput=()=>{if(!zip.value){const z=String(addr.value).match(/\b\d{5}\b/);if(z)zip.value=z[0]}refreshCode()};
      $('#ldc-cancel').onclick=()=>window.bootstrap.Modal.getInstance($('#compatLdModal'))?.hide();
      $('#ldc-save').onclick=async()=>{
        const companyV=company.value.trim(),addressV=addr.value.trim(),z=String(zip.value||'').replace(/\D/g,'').slice(0,5);if(!companyV||!addressV||z.length!==5){toast('Company, Address y ZIP Code de 5 dígitos son obligatorios',false);return}
        let idCliente=cid.value?Number(cid.value):null;
        if(!idCliente){idCliente=Math.max(0,...localCustomers.map(c=>num(c.id_cliente)))+1;const ins=await sbx.from('customers').insert({id_cliente:idCliente,id_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,accessories:'-',local_delivery_cost_1:'',local_delivery_cost_extra:''});if(ins.error){toast(ins.error.message,false);return}}
        else{const up=await sbx.from('customers').update({id_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,accessories:'-'}).eq('id_cliente',idCliente);if(up.error){toast(up.error.message,false);return}}
        const payload={id_cliente:idCliente,id_cliente_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,date:dateDMY(date.value),cost_1:c1.value===''?null:num(c1.value),cost_extra:ce.value===''?null:num(ce.value)};
        const save=id==null?await sbx.from('local_delivery_cost_history').insert(payload):await sbx.from('local_delivery_cost_history').update(payload).eq('id',id);
        if(save.error){toast(save.error.message,false);return}toast(id==null?'Local Delivery guardado':'Local Delivery actualizado');window.bootstrap.Modal.getInstance($('#compatLdModal'))?.hide();compatBindLocal();
      };
      if(row?.id_cliente_code){code.value=row.id_cliente_code}else{refreshCode()}
    });
  }
  window.bindLocal=async function(){
    ensureCompatCss(); const s=$('#ldsearch'); if(s)s.onclick=compatBindLocal; $('#ldq')?.addEventListener('input',()=>compatBindLocal()); compatBindLocal();
  };
  window.editLocalDelivery=compatEditLocalDelivery;

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

  async function compatLoadCrud(kind){
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
    // Current page may already have been rendered before this compatibility script executed.
    replaceButton('view-quotes',()=>window.openBootstrapModal('compatQuotesModal','View Quotes',`<div class="between"><div class="compat-action-row"><input id="vq" class="input" style="width:220px" placeholder="Quote / company / product"><input id="vf" class="input" type="date"><input id="vt" class="input" type="date"><button class="btn primary" id="search-quotes">Buscar</button></div></div><div id="quotes-table" class="scroll-x" style="margin-top:12px"></div>`,()=>{const d=todayISO();$('#vf').value=d;$('#vt').value=d;$('#search-quotes').onclick=compatLoadQuotes;compatLoadQuotes();}));
    replaceButton('export',()=>window.openExportModal());
    replaceButton('reports',()=>window.openReportsModal());
    // Database uses the existing navigation; its report/local/CRUD tabs call our patched globals dynamically.
  }

  const legacyBindQuote=legacy.bindQuote;
  window.bindQuote=function(){
    legacyBindQuote?.();
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
})();+Number(z.price||0).toFixed(costMode?2:0)+' ('+z.config+') '+z.transport)].join('\n');
    const rowHtml=lines.map(z=>'<tr><td style="padding:4px 6px;font-weight:700;border:0">'+esc(z.product)+',</td><td style="padding:4px 6px;white-space:nowrap;border:0">'+esc(z.qty)+'</td><td style="padding:4px 6px;font-weight:700;white-space:nowrap;border:0">'+esc(z.platform)+'</td><td style="padding:4px 6px;font-weight:700;white-space:nowrap;border:0">$ '+Number(z.price||0).toFixed(costMode?2:0)+'</td><td style="padding:4px 6px;border:0;color:#777">('+esc(z.config)+')</td><td style="padding:4px 6px;white-space:nowrap;border:0">'+esc(z.transport)+'</td></tr>').join('');
    const serviceHtml=services?'<p style="margin:4px 0;color:#666"><i>Services: '+esc(services)+'</i></p>':'';
    const body='<div style="font-family:Arial,sans-serif;font-size:14px;color:var(--bs-body-color)"><div style="margin-bottom:14px"><b>Quote: #'+esc(first.quote)+'</b></div><table style="width:100%;border-collapse:collapse;margin-bottom:18px"><tbody>'+rowHtml+'</tbody></table><p style="margin:2px 0"><b>'+esc(first.type||'')+'</b></p><p style="margin:2px 0"><b>'+esc(first.company_name||'')+'</b></p><p style="margin:2px 0">'+esc(first.address||'')+'</p>'+serviceHtml+'<div class="compat-action-row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" id="preview-copy">📋 Copiar (Correo)</button><button class="btn success" id="preview-pdf">📄 Preview PDF</button></div></div>';
    window.openBootstrapModal('compatPreviewModal','Preview - Quote #'+first.quote,body,()=>{
      $('#preview-copy').onclick=()=>copyText(copy).then(()=>toast('Cotización copiada al portapapeles')).catch(()=>toast('No se pudo copiar',false));
      $('#preview-pdf').onclick=()=>printReport(costMode?'Quote Cost Preview':'Quote Preview','QUOTE #'+first.quote+' | DATE: '+first.date+' | CUSTOMER: '+(first.company_name||''),lines.map(z=>({PRODUCT:z.product,QTY:z.qty,PLATFORM:z.platform,PRICE:Number(z.price||0).toFixed(costMode?2:0),CONFIGURATION:z.config,TRANSPORT:z.transport})));
    });
  }
  window.openPreview=compatOpenPreview;

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
    for(const t of ['quotes','local_quotes']){const {error}=await sbx.from(t).delete().eq('quote_instance_id',iid);if(error){toast(error.message,false);return}}
    toast('Cotización eliminada'); await compatLoadQuotes();
  }
  window.deleteQuote=compatDeleteQuote;

  async function compatLoadQuotes(){
    if(!sbx)return; const host=$('#quotes-table'); if(!host)return;
    try{
      const [q,l]=await Promise.all([allRows('quotes','quote_instance_id,date,quote,company_name,address,type,product'),allRows('local_quotes','quote_instance_id,date,quote,company_name,address,type,product')]);
      let rows=[...q,...l]; const term=norm($('#vq')?.value||''),from=$('#vf')?.value||'',to=$('#vt')?.value||'';
      if(term)rows=rows.filter(r=>[r.quote,r.company_name,r.address,r.product].some(v=>norm(v).includes(term)));
      if(from||to)rows=rows.filter(r=>{const d=dateISO(r.date);return(!from||d>=from)&&(!to||d<=to)});
      const groups=new Map(); for(const r of rows){const k=String(r.quote_instance_id||`LEGACY|${r.quote}|${r.date}|${r.company_name}|${r.address}|${r.type}`);if(!groups.has(k))groups.set(k,r)}
      rows=[...groups.entries()].map(([iid,r])=>({...r,_iid:iid}));
      rows.sort((a,b)=>dateISO(b.date).localeCompare(dateISO(a.date))||String(b.quote||'').localeCompare(String(a.quote||'')));
      host.innerHTML=`<table class="data-table"><thead><tr><th>DATE</th><th>QUOTE #</th><th>COMPANY OR NAME</th><th>ADDRESS</th><th>TYPE</th><th>PRODUCT</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.quote)}</td><td>${esc(r.company_name)}</td><td>${esc(r.address)}</td><td>${esc(r.type)}</td><td>${esc(r.product)}</td><td class="compat-action-row"><button class="btn success btn-sm" data-qsp="${esc(r._iid)}">SP</button><button class="btn warning btn-sm" data-qco="${esc(r._iid)}">COST</button><button class="btn primary btn-sm" data-qdet="${esc(r._iid)}">Details</button><button class="btn secondary btn-sm" data-qedit="${esc(r._iid)}">Edit</button><button class="btn danger btn-sm" data-qdel="${esc(r._iid)}">Delete</button></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-qsp]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qsp,'SP'));
      host.querySelectorAll('[data-qco]').forEach(b=>b.onclick=()=>compatOpenPreview(b.dataset.qco,'COST'));
      host.querySelectorAll('[data-qdet]').forEach(b=>b.onclick=()=>compatOpenDetails(b.dataset.qdet));
      host.querySelectorAll('[data-qedit]').forEach(b=>b.onclick=()=>legacy.editQuote?.(b.dataset.qedit));
      host.querySelectorAll('[data-qdel]').forEach(b=>b.onclick=()=>compatDeleteQuote(b.dataset.qdel));
    }catch(e){console.error(e);toast('No se pudieron cargar las cotizaciones: '+e.message,false)}
  }
  window.loadQuotes=compatLoadQuotes;
  window.bindQuotes=function(){
    const b=$('#search-quotes'); if(b)b.onclick=compatLoadQuotes; compatLoadQuotes();
  };

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
    const wrap=document.createElement('div');wrap.className='compat-filter-wrap';wrap.innerHTML=`<span class="label">${label}</span><button type="button" class="btn btn-outline-secondary compat-filter-btn">Optional</button><div class="compat-filter-menu hidden"></div>`;return wrap;
  }
  function selectedFilterValues(wrap){return [...wrap.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value)}
  function fillFilter(wrap,values,old=[]){
    const menu=wrap.querySelector('.compat-filter-menu'), btn=wrap.querySelector('.compat-filter-btn');const keep=new Set(old);menu.innerHTML=values.map(v=>`<label><input type="checkbox" value="${esc(v)}" ${keep.has(v)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
    const update=()=>{const vals=selectedFilterValues(wrap);btn.textContent=vals.length?vals.join(', '):'Optional'};menu.querySelectorAll('input').forEach(x=>x.onchange=update);update(); btn.onclick=()=>menu.classList.toggle('hidden');
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
        <label class="compat-span-2"><span class="label"># Quote</span><input id="rep-quote" class="input" placeholder="Optional"></label>
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
    fillFilter(cw,cats,prevCat.filter(x=>cats.includes(x)));fillFilter(tw,types,prevType.filter(x=>types.includes(x)));
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
    const k=$('#rep-kind'); if(!k)return;
    await refreshReportFilterOptions();
    // Default desktop behavior: the daily report starts on today.
    k.value='winning_daily'; $('#rep-from').value=todayISO();$('#rep-to').value=todayISO();
    await refreshReportFilterOptions();
    const refresh=async()=>{await refreshReportFilterOptions()};
    k.onchange=refresh;
    $('#rep-all').onchange=()=>{const disabled=$('#rep-all').checked;$('#rep-from').disabled=disabled;$('#rep-to').disabled=disabled};
    $('#rep-search').onclick=runReport;
    $('#rep-xlsx').onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const cols=Object.keys(reportCache[0]);downloadXlsx('LogiSuite_'+(reportTitle||'Report'),reportCache,cols)};
    $('#rep-pdf').onclick=()=>{if(!reportCache.length){toast('Primero genera el reporte',false);return}const f=reportFiltersState();printReport(reportTitle,`${f.from||'ALL'} → ${f.to||'ALL'}`,reportCache)};
    await runReport();
  };

  function openReportsCompat(title){window.openBootstrapModal('compatReportsModal',title||'Reportes',reportViewHtml(),()=>window.bindReports());}
  window.openReportsModal=()=>openReportsCompat('Reportes');
  window.openExportModal=()=>openReportsCompat('Export Reports');

  /* Local Delivery history CRUD. */
  async function compatBindLocal(){
    const host=$('#ldtable'); if(!host||!sbx)return;
    const toolbar=$('#ldq')?.parentElement; if(toolbar&&!toolbar.querySelector('[data-ld-add]')){const b=document.createElement('button');b.type='button';b.className='btn success';b.dataset.ldAdd='1';b.textContent='➕ Add Local Delivery Cost';b.onclick=()=>compatEditLocalDelivery(null);toolbar.appendChild(b)}
    try{
      const term=norm($('#ldq')?.value||''); let rows=await allRows('local_delivery_cost_history');
      if(term)rows=rows.filter(r=>[r.company_name,r.address,r.id_cliente_code,r.type].some(v=>norm(v).includes(term)));
      rows.sort((a,b)=>dateISO(b.date).localeCompare(dateISO(a.date))||num(b.id)-num(a.id));
      host.innerHTML=`<table class="data-table"><thead><tr><th>ID</th><th>ID CLIENTE</th><th>CODE</th><th>TYPE</th><th>COMPANY</th><th>ADDRESS</th><th>DATE</th><th>COST 1</th><th>EXTRA</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.id_cliente)}</td><td>${esc(r.id_cliente_code)}</td><td>${esc(r.type)}</td><td>${esc(r.company_name)}</td><td>${esc(r.address)}</td><td>${esc(r.date)}</td><td>$${num(r.cost_1).toFixed(2)}</td><td>$${num(r.cost_extra).toFixed(2)}</td><td><div class="compat-action-row"><button class="btn primary btn-sm" data-ld-edit="${r.id}">Edit</button><button class="btn danger btn-sm" data-ld-del="${r.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
      host.querySelectorAll('[data-ld-edit]').forEach(b=>b.onclick=()=>compatEditLocalDelivery(Number(b.dataset.ldEdit)));
      host.querySelectorAll('[data-ld-del]').forEach(b=>b.onclick=()=>compatDeleteLocalDelivery(Number(b.dataset.ldDel)));
    }catch(e){toast('No se pudo cargar Local Delivery: '+e.message,false)}
  }
  async function compatDeleteLocalDelivery(id){if(!confirm('¿Eliminar este registro histórico de costo?'))return;const {error}=await sbx.from('local_delivery_cost_history').delete().eq('id',id);if(error){toast(error.message,false);return}toast('Registro histórico eliminado');compatBindLocal()}

  async function compatEditLocalDelivery(id=null){
    let row=null; if(id!=null){const {data,error}=await sbx.from('local_delivery_cost_history').select('*').eq('id',id).maybeSingle();if(error||!data){toast(error?.message||'Registro no encontrado',false);return}row=data}
    const localCustomers=await allRows('customers');
    const opts=['<option value="">— Seleccionar cliente —</option>',...localCustomers.filter(c=>localType(c.type)).map(c=>`<option value="${esc(c.id_cliente)}">${esc(c.company_name)} · ${esc(c.address)}</option>`)].join('');
    const body=`<div class="compat-form-grid"><label class="full"><span class="label">Customer</span><select id="ldc-customer" class="select">${opts}</select></label><label><span class="label">Company or Name</span><input id="ldc-company" class="input"></label><label><span class="label">ZIP CODE</span><input id="ldc-zip" class="input" maxlength="5" inputmode="numeric"></label><label class="full"><span class="label">ZIP CODE/ADDRESS</span><textarea id="ldc-address" class="textarea"></textarea></label><label><span class="label">DATE</span><input id="ldc-date" type="date" class="input"></label><label><span class="label">ID CLIENTE</span><input id="ldc-id" class="input" readonly></label><label><span class="label">ID CLIENTE CODE</span><input id="ldc-code" class="input" readonly></label><label><span class="label">Costo LD 1er Pallet</span><input id="ldc-c1" class="input" type="number" step="0.01"></label><label><span class="label">Costo LD Extra</span><input id="ldc-ce" class="input" type="number" step="0.01"></label></div><div class="compat-action-row" style="justify-content:flex-end;margin-top:14px"><button class="btn secondary" id="ldc-cancel" type="button">Cancel</button><button class="btn success" id="ldc-save" type="button">Save</button></div>`;
    window.openBootstrapModal('compatLdModal',id==null?'Add Local Delivery Cost':'Edit Local Delivery Cost',body,()=>{
      const customer=$('#ldc-customer'),company=$('#ldc-company'),zip=$('#ldc-zip'),addr=$('#ldc-address'),date=$('#ldc-date'),cid=$('#ldc-id'),code=$('#ldc-code'),c1=$('#ldc-c1'),ce=$('#ldc-ce');
      if(row){customer.value=String(row.id_cliente??'');company.value=row.company_name||'';addr.value=row.address||'';zip.value=(String(row.address||'').match(/\b\d{5}\b/)||[''])[0];date.value=dateISO(row.date);cid.value=row.id_cliente??'';code.value=row.id_cliente_code||'';c1.value=row.cost_1??'';ce.value=row.cost_extra??''}
      else{date.value=todayISO();ce.value='20'}
      const refreshCode=()=>{const z=String(zip.value||'').replace(/\D/g,'').slice(0,5);if(!z){code.value='';return}const used=new Set(localCustomers.filter(c=>String(c.id_cliente)!==String(cid.value||'')).map(c=>norm(c.id_code)));const base='LD'+z;let v=base,n=2;while(used.has(norm(v))){v=base+'_'+n;n++}code.value=v};
      customer.onchange=()=>{const c=localCustomers.find(x=>String(x.id_cliente)===String(customer.value));if(c){cid.value=c.id_cliente??'';code.value=c.id_code||'';company.value=c.company_name||'';addr.value=c.address||'';zip.value=(String(c.address||'').match(/\b\d{5}\b/)||[''])[0]}};
      zip.oninput=refreshCode;addr.oninput=()=>{if(!zip.value){const z=String(addr.value).match(/\b\d{5}\b/);if(z)zip.value=z[0]}refreshCode()};
      $('#ldc-cancel').onclick=()=>window.bootstrap.Modal.getInstance($('#compatLdModal'))?.hide();
      $('#ldc-save').onclick=async()=>{
        const companyV=company.value.trim(),addressV=addr.value.trim(),z=String(zip.value||'').replace(/\D/g,'').slice(0,5);if(!companyV||!addressV||z.length!==5){toast('Company, Address y ZIP Code de 5 dígitos son obligatorios',false);return}
        let idCliente=cid.value?Number(cid.value):null;
        if(!idCliente){idCliente=Math.max(0,...localCustomers.map(c=>num(c.id_cliente)))+1;const ins=await sbx.from('customers').insert({id_cliente:idCliente,id_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,accessories:'-',local_delivery_cost_1:'',local_delivery_cost_extra:''});if(ins.error){toast(ins.error.message,false);return}}
        else{const up=await sbx.from('customers').update({id_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,accessories:'-'}).eq('id_cliente',idCliente);if(up.error){toast(up.error.message,false);return}}
        const payload={id_cliente:idCliente,id_cliente_code:code.value,type:'Local Delivery',company_name:companyV,address:addressV,date:dateDMY(date.value),cost_1:c1.value===''?null:num(c1.value),cost_extra:ce.value===''?null:num(ce.value)};
        const save=id==null?await sbx.from('local_delivery_cost_history').insert(payload):await sbx.from('local_delivery_cost_history').update(payload).eq('id',id);
        if(save.error){toast(save.error.message,false);return}toast(id==null?'Local Delivery guardado':'Local Delivery actualizado');window.bootstrap.Modal.getInstance($('#compatLdModal'))?.hide();compatBindLocal();
      };
      if(row?.id_cliente_code){code.value=row.id_cliente_code}else{refreshCode()}
    });
  }
  window.bindLocal=async function(){
    ensureCompatCss(); const s=$('#ldsearch'); if(s)s.onclick=compatBindLocal; $('#ldq')?.addEventListener('input',()=>compatBindLocal()); compatBindLocal();
  };
  window.editLocalDelivery=compatEditLocalDelivery;

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

  async function compatLoadCrud(kind){
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
    // Current page may already have been rendered before this compatibility script executed.
    replaceButton('view-quotes',()=>window.openBootstrapModal('compatQuotesModal','View Quotes',`<div class="between"><div class="compat-action-row"><input id="vq" class="input" style="width:220px" placeholder="Quote / company / product"><input id="vf" class="input" type="date"><input id="vt" class="input" type="date"><button class="btn primary" id="search-quotes">Buscar</button></div></div><div id="quotes-table" class="scroll-x" style="margin-top:12px"></div>`,()=>{const d=todayISO();$('#vf').value=d;$('#vt').value=d;$('#search-quotes').onclick=compatLoadQuotes;compatLoadQuotes();}));
    replaceButton('export',()=>window.openExportModal());
    replaceButton('reports',()=>window.openReportsModal());
    // Database uses the existing navigation; its report/local/CRUD tabs call our patched globals dynamically.
  }

  const legacyBindQuote=legacy.bindQuote;
  window.bindQuote=function(){
    legacyBindQuote?.();
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